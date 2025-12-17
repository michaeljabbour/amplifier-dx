# Architecture Boundaries

The single most important concept for Amplifier developers: **what belongs where**.

---

## The Core Insight

Amplifier separates **mechanism** (how things work) from **policy** (what to do):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   APPLICATION LAYER                                                         │
│   ─────────────────                                                         │
│   "Policy" - What to do, how to present, where to find things               │
│                                                                             │
│   Examples: amplifier-app-cli, amplifier-desktop, your-custom-app           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   KERNEL LAYER                                                              │
│   ────────────                                                              │
│   "Mechanism" - How to coordinate, dispatch, validate                       │
│                                                                             │
│   amplifier-core (one implementation, many consumers)                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   MODULE LAYER                                                              │
│   ────────────                                                              │
│   "Capabilities" - What can be done (tools, providers, hooks)               │
│                                                                             │
│   amplifier-module-* (many implementations, shared by apps)                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why This Matters

When boundaries are respected:
- Apps can share modules without conflict
- Kernel updates benefit all apps
- Modules work in any compliant app
- Testing is isolated and predictable

When boundaries are violated:
- Apps become fragile and hard to maintain
- Kernel bypasses create inconsistent behavior
- Modules only work in specific apps
- Bugs are hard to trace

**The Amplifier Desktop rebuild was necessary specifically because the sidecar violated these boundaries.**

---

## What Belongs Where

### Application Layer Responsibilities

The **application** owns everything user-facing and environment-specific:

| Responsibility | Example | Why App Layer |
|----------------|---------|---------------|
| **UX Systems** | CLIApprovalSystem, WebSocketDisplay | Apps decide how to show things |
| **Module Resolution Policy** | CompositeModuleResolver | Apps decide where to find modules |
| **Settings Persistence** | ~/.amplifier/settings.yaml | Apps decide where to store config |
| **Profile/Bundle Loading** | ProfileLoader, load_bundle() | Apps decide what configurations exist |
| **@Mention Processing** | MentionResolver | Apps decide what @mentions mean |
| **Capability Registration** | session.spawn, broadcast | Apps inject their behaviors |
| **Transport** | WebSocket, REST, Console | Apps decide how to communicate |

**Key principle**: If it touches the user or filesystem, it's app-layer.

### Kernel Layer Responsibilities

The **kernel** owns coordination and contracts:

| Responsibility | Example | Why Kernel Layer |
|----------------|---------|------------------|
| **Session Lifecycle** | create, initialize, execute, cleanup | Standard lifecycle for all apps |
| **Module Coordination** | ModuleCoordinator.mount() | Standard way to compose modules |
| **Hook Dispatch** | HookRegistry.emit() | Standard event ordering |
| **Capability Registry** | coordinator.register_capability() | Standard extension point |
| **Config Validation** | Validate mount plan structure | Standard contract enforcement |

**Key principle**: If it's about coordinating modules, it's kernel-layer.

### Module Layer Responsibilities

**Modules** provide capabilities that any app can use:

| Responsibility | Example | Why Module Layer |
|----------------|---------|------------------|
| **Tool Execution** | tool-filesystem, tool-memory | Reusable actions |
| **Provider Communication** | provider-anthropic | LLM API abstraction |
| **Hook Behavior** | hooks-logging, hooks-event-broadcast | Reusable event handling |
| **Orchestration Logic** | loop-streaming | Execution patterns |
| **Context Management** | context-simple | Message storage strategies |

**Key principle**: If it's a reusable capability, it's module-layer.

---

## The Boundary Test

Ask these questions to determine where code belongs:

### "Does this need to know about the user interface?"

**Yes → Application Layer**

```python
# App layer - knows about console
class CLIApprovalSystem:
    def request_approval(self, tool_call):
        console.print(f"Allow {tool_call.name}? [y/n]")
        return input() == 'y'
```

**No → Kernel or Module Layer**

```python
# Kernel layer - just coordinates
def emit(self, event: str, data: dict):
    for hook in self.hooks[event]:
        result = await hook.handler(event, data)
        if result.action == "deny":
            return result
```

### "Does this define HOW to do something vs WHAT to do?"

**HOW (mechanism) → Kernel Layer**

```python
# Kernel - how hooks dispatch
async def dispatch_hooks(self, event, data):
    for hook in sorted(self.hooks, key=lambda h: h.priority):
        await hook.handler(event, data)
```

**WHAT (policy) → Application Layer**

```python
# App - what hooks to load
config = {
    "hooks": [
        {"module": "hooks-logging"},
        {"module": "hooks-approval"},
    ]
}
```

### "Could another app use this unchanged?"

**Yes → Module Layer**

```python
# Module - any app can use this tool
class MemoryTool:
    async def execute(self, input):
        return await self.store.add(input["content"])
```

**No → Application Layer**

```python
# App - specific to Desktop's WebSocket transport
async def ws_broadcast(event, data):
    await websocket.send_json({"type": event, **data})
```

---

## Correct Patterns

### Pattern 1: Capability Injection

Apps provide transport; modules use it without knowing the details.

```python
# APP LAYER - registers capability
async def desktop_broadcast(event: str, data: dict):
    await websocket.send_json({"type": event, **data})

session.coordinator.register_capability("broadcast", desktop_broadcast)

# MODULE LAYER - uses capability abstractly
async def on_event(event: str, data: dict):
    broadcast = coordinator.get_capability("broadcast")
    if broadcast:
        await broadcast(event, data)  # Works for any transport!
```

### Pattern 2: Bundle Loading

Apps load bundles; foundation resolves modules.

```python
# APP LAYER - decides what bundle to load
bundle = await load_bundle("foundation:bundles/desktop")

# FOUNDATION LAYER - resolves module sources
# (internal to foundation)

# KERNEL LAYER - mounts modules to coordinator
session = await bundle.prepare().create_session()
```

### Pattern 3: Event Handling

Kernel dispatches; modules react; apps display.

```python
# KERNEL LAYER - dispatches events
await hooks.emit("tool:post", {"tool": "bash", "result": output})

# MODULE LAYER - logs the event
async def on_tool_post(event, data):
    logger.info(f"Tool {data['tool']} completed")

# APP LAYER - displays to user
async def on_tool_post(event, data):
    console.print(f"✓ {data['tool']}")  # CLI-specific display
```

---

## Anti-Patterns to Avoid

### ❌ Kernel Bypass

```python
# WRONG - App calling provider directly, bypassing kernel
response = await anthropic_client.messages.create(...)

# CORRECT - App goes through session
result = await session.execute(prompt)
```

### ❌ Module with Transport Knowledge

```python
# WRONG - Module knows about WebSocket
class MyHook:
    async def on_event(self, event, data):
        await websocket.send_json(data)  # Module shouldn't know this!

# CORRECT - Module uses capability
class MyHook:
    async def on_event(self, event, data):
        broadcast = self.coordinator.get_capability("broadcast")
        if broadcast:
            await broadcast(event, data)
```

### ❌ App Reimplementing Kernel Logic

```python
# WRONG - App has its own orchestrator loop
while True:
    response = await provider.complete(messages)
    if response.tool_calls:
        for call in response.tool_calls:
            result = await tools[call.name].execute(call.input)
            messages.append(...)

# CORRECT - App uses session.execute()
result = await session.execute(prompt)
```

### ❌ Module Depending on Specific App

```python
# WRONG - Module imports CLI code
from amplifier_app_cli.display import console

# CORRECT - Module uses capabilities or stays generic
broadcast = coordinator.get_capability("broadcast")
```

---

## Visual Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER                                           │
│                      (CLI, Desktop, Web, Mobile)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  amplifier-app-cli          OR    amplifier-desktop                  │   │
│  │  ────────────────                  ─────────────────                 │   │
│  │  • CLIApprovalSystem               • WebSocketTransport              │   │
│  │  • CLIDisplaySystem                • TauriLifecycle                  │   │
│  │  • ConsoleRenderer                 • ReactFrontend                   │   │
│  │  • ProfileLoader                   • SettingsStore                   │   │
│  │  • MentionResolver                 • ProfileManager                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│                    register_capability("broadcast", ...)                    │
│                    register_capability("approval", ...)                     │
│                                   │                                         │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          KERNEL LAYER                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  amplifier-core                                                      │   │
│  │  ──────────────                                                      │   │
│  │  • AmplifierSession.execute()                                        │   │
│  │  • ModuleCoordinator.mount() / .get()                                │   │
│  │  • HookRegistry.emit() / .register()                                 │   │
│  │  • CapabilityRegistry                                                │   │
│  │  • Config validation                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│              Mount Plan: {orchestrator, providers, tools, hooks}            │
│                                   │                                         │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MODULE LAYER                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Orchestrators│  │  Providers   │  │    Tools     │  │    Hooks     │    │
│  │ ────────────│  │ ────────────│  │ ────────────│  │ ────────────│    │
│  │ loop-basic   │  │ anthropic    │  │ filesystem   │  │ logging      │    │
│  │ loop-stream  │  │ openai       │  │ bash         │  │ approval     │    │
│  │              │  │ azure        │  │ memory       │  │ broadcast    │    │
│  │              │  │              │  │ mcp          │  │ redaction    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                             │
│  All modules follow protocols defined by amplifier-core                     │
│  All modules are loaded via mount() function                                │
│  All modules are transport-agnostic                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Checklist: Is My Architecture Correct?

- [ ] App layer handles all UX (display, approval, user input)
- [ ] App layer loads bundles/profiles (kernel doesn't know where they come from)
- [ ] App layer registers capabilities (modules request them abstractly)
- [ ] Kernel layer validates config structure (not content policy)
- [ ] Kernel layer dispatches hooks (doesn't know what they do)
- [ ] Kernel layer coordinates modules (doesn't implement capabilities)
- [ ] Modules implement protocols (Tool, Hook, Provider, etc.)
- [ ] Modules use capabilities, not imports from apps
- [ ] Modules are transport-agnostic (no WebSocket/console/HTTP knowledge)

---

**When in doubt: Can another app use this unchanged? If not, it belongs in the app layer.**

---

**Previous**: [5-Minute Understanding](./05-quick-start.md)  
**Next**: [Module Lifecycle →](./09-module-lifecycle.md)
