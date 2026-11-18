# Architecture Boundaries

The single most important concept for Amplifier developers: **what belongs where**.

**For the visual:** see the
[architecture stack diagram](../assets/diagrams/architecture-stack.png) and the
[dependency rules diagram](../assets/diagrams/dependency-rules.png) for a
verified, current picture of the layers and allowed dependency directions.

**Foundation Layer Note:** This document groups Application + Foundation as "Application Layer." In practice, **amplifier-foundation** sits between your app and amplifier-core, acting as a factory that loads bundles, composes configuration, and creates sessions. The reference application
[`amplifier-app-cli`](https://github.com/microsoft/amplifier-app-cli) shows the three-layer
architecture in action: Application → Foundation → Core.

**Kernel implementation note:** `amplifier-core` 2.0 is implemented in Rust with PyO3
Python bindings. Top-level imports (`from amplifier_core import ...`) resolve to
Rust-backed types. The Python protocols and event names are unchanged from 1.x; 2.0
added optional fields and changed Rust construction APIs. Two behaviours differ from
the old pure-Python session: `execute()` requires `initialize()` first, and the
`loader=` constructor argument is ignored.

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
│   Examples: amplifier-app-cli (reference), your-custom-app                  │
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

**When boundaries are violated in practice, the result is fragile apps that need costly rework.**

---

## What Belongs Where

### Application Layer Responsibilities

The **application** owns everything user-facing and environment-specific:

| Responsibility | Example | Why App Layer |
|----------------|---------|---------------|
| **UX Systems** | CLIApprovalSystem, CLIDisplaySystem | Apps decide how to show things |
| **Module Resolution Policy** | AppModuleResolver | Apps decide where to find modules |
| **Settings Persistence** | ~/.amplifier/settings.yaml | Apps decide where to store config |
| **Bundle Loading** | load_bundle(), BundleRegistry (amplifier-foundation) | Apps decide what configurations exist |
| **@Mention Processing** | AppMentionResolver | Apps decide what @mentions mean |
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
| **Config Validation** | Requires `session.orchestrator` and `session.context`; full structural checks via `amplifier_core.validation.MountPlanValidator` | Standard contract enforcement |

**Key principle**: If it's about coordinating modules, it's kernel-layer.

### Module Layer Responsibilities

**Modules** provide capabilities that any app can use:

| Responsibility | Example | Why Module Layer |
|----------------|---------|------------------|
| **Tool Execution** | tool-filesystem, tool-bash | Reusable actions |
| **Provider Communication** | provider-anthropic | LLM API abstraction |
| **Hook Behavior** | hooks-logging, hooks-approval | Reusable event handling |
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
    async def request_approval(self, prompt, options, timeout, default):
        console.print(f"{prompt} {options}")
        choice = input()
        return choice if choice in options else default
```

**No → Kernel or Module Layer**

```python
# Kernel layer - just coordinates (sketch of HookRegistry.emit)
# A Python paraphrase of the Rust dispatch logic, not real kernel code.
async def emit(self, event: str, data: dict) -> HookResult:
    ask_user = None
    injections = []
    for handler in self.handlers_for(event):        # sorted by priority, lowest first
        try:
            result = await handler(event, data)
        except Exception:
            continue                                 # logged and skipped
        if result.action == "deny":
            return result                            # short-circuit
        if result.action == "modify" and result.data is not None:
            data = result.data                       # chained to the next handler
        if result.action == "inject_context":
            injections.append(result)
        if result.action == "ask_user" and ask_user is None:
            ask_user = result                        # first one wins
    if ask_user:
        return ask_user
    if injections:
        return merge(injections)
    return HookResult(action="continue", data=data)
```

### "Does this define HOW to do something vs WHAT to do?"

**HOW (mechanism) → Kernel Layer**

```python
# Kernel - how hooks dispatch (same sketch as above, abridged)
async def emit(self, event, data):
    for handler in self.handlers_for(event):   # this event's handlers, lowest priority number first
        result = await handler(event, data)
        ...                                    # deny / ask_user / inject_context / modify handling
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
bundle = await load_bundle(
    "git+https://github.com/microsoft/amplifier-foundation@main"
    "#subdirectory=bundles/anchors/bundle.md"
)

# FOUNDATION LAYER - resolves module sources, downloads and activates modules
prepared = await bundle.prepare()

# KERNEL LAYER - the session mounts the modules on its coordinator
session = await prepared.create_session()
```

### Pattern 3: Event Handling

Kernel dispatches; modules react; apps display.

```python
# ORCHESTRATOR MODULE emits; KERNEL LAYER dispatches
await hooks.emit("tool:post", {"tool_name": "bash", "tool_input": tool_input, "tool_result": result})

# MODULE LAYER - logs the event
async def on_tool_post(event, data):
    logger.info(f"Tool {data['tool_name']} completed")

# APP LAYER - displays to user
async def on_tool_post(event, data):
    console.print(f"✓ {data['tool_name']}")  # CLI-specific display
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
│  │  amplifier-app-cli (reference) OR your-custom-app                    │   │
│  │  ────────────────                  ────────────────                  │   │
│  │  • CLIApprovalSystem               • YourApprovalSystem              │   │
│  │  • CLIDisplaySystem                • YourDisplaySystem               │   │
│  │  • AppSettings                     • YourSettings                    │   │
│  │  • AppModuleResolver               • YourModuleResolver              │   │
│  │  • AppMentionResolver              • YourMentionResolver             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│                    register_capability("broadcast", ...)                    │
│       AmplifierSession(config, approval_system=..., display_system=...)     │
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
│  │  • ModuleCoordinator.register_capability() / .get_capability()       │   │
│  │  • Config validation                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│  Mount Plan: {session: {orchestrator, context}, providers, tools, hooks,    │
│               agents}                                                       │
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
│  Python modules are loaded via their mount() function (modules declaring    │
│  a wasm, grpc or rust transport in amplifier.toml use the matching loader)  │
│  All modules are transport-agnostic                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Checklist: Is My Architecture Correct?

- [ ] App layer handles all UX (display, approval, user input)
- [ ] App layer loads bundles (kernel doesn't know where they come from)
- [ ] App layer registers capabilities (modules request them abstractly)
- [ ] Kernel layer validates config structure (not content policy)
- [ ] Kernel layer dispatches hooks (doesn't know what they do)
- [ ] Kernel layer coordinates modules (doesn't implement capabilities)
- [ ] Modules implement protocols (Tool, HookHandler, Provider, etc.)
- [ ] Modules use capabilities, not imports from apps
- [ ] Modules are transport-agnostic (no WebSocket/console/HTTP knowledge)

---

**When in doubt: Can another app use this unchanged? If not, it belongs in the app layer.**

---

**Previous**: [5-Minute Understanding](./05-quick-start.md)  
**Next**: [Ecosystem Quick Map →](./09-ecosystem-quick-map.md)
