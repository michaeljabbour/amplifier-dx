# Layers of Understanding

Not everyone needs the same depth. Here's the progressive path from "just use it" to "build on it."

---

## The Five Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Layer 5: UNDERSTAND   │  Internals, architecture, contribute       │
│  ──────────────────────┼───────────────────────────────────────────│
│  Layer 4: EMBED        │  Use as a library in your app              │
│  ──────────────────────┼───────────────────────────────────────────│
│  Layer 3: EXTEND       │  Write custom tools and hooks              │
│  ──────────────────────┼───────────────────────────────────────────│
│  Layer 2: CONFIGURE    │  Bundles, settings, module selection       │
│  ──────────────────────┼───────────────────────────────────────────│
│  Layer 1: USE          │  Run commands, get work done               │
│                                                                     │
│  Most people never need past Layer 2.                               │
│  That's fine. That's the point.                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: USE

**Goal:** Get work done with Amplifier.

**You know:**
- How to run prompts
- How to choose bundles
- What the output means

**You need:**
```bash
# Basic usage
amplifier run "List Python files"
amplifier run --bundle foundation "Help me fix this bug"

# Interactive mode
amplifier

# See what's available
amplifier bundle list
amplifier module list
```

With no bundle selected, the installed 2026.09.06 build runs the `anchors` root. Upstream
main has since moved the default to `anchors-amp-dev`, which includes Anchors. `foundation`
remains a selectable complete root.

**Docs for this layer:**
- [Quickstart](../index.html#quickstart)
- [CLI Reference](../index.html#cli)

**Time to master:** 10 minutes

---

## Layer 2: CONFIGURE

**Goal:** Customize Amplifier for your workflow.

**You know:**
- How settings cascade
- How to write bundles
- How to select modules
- How to share team configurations

**You need:**

### Settings
```yaml
# ~/.amplifier/settings.yaml
bundle:
  active: my-bundle        # written by: amplifier bundle use my-bundle
  app:                     # behaviors composed onto every session
    - git+https://github.com/microsoft/amplifier-bundle-recipes@main#subdirectory=behaviors/recipes.yaml
config:
  providers:
    - module: provider-anthropic
      config:
        api_key: ${ANTHROPIC_API_KEY}   # the value lives in ~/.amplifier/keys.env
        default_model: claude-sonnet-5
        priority: 1
```

Prefer the commands to hand-editing: `amplifier bundle use <name>` selects the root,
`amplifier init` and `amplifier provider add` configure providers, and
`amplifier bundle add '<uri>#subdirectory=behaviors/x.yaml' --app` adds a behavior.
A behavior is the unit you add: it layers agents, context and tools onto the root you
already run, without replacing it.

### Bundles
```yaml
# .amplifier/bundles/team-coding.md
---
bundle:
  name: team-coding
  version: 1.0.0
  description: Team defaults for coding work

includes:
  - bundle: git+https://github.com/microsoft/amplifier-foundation@main#subdirectory=bundles/anchors/bundle.md
  - bundle: git+https://github.com/microsoft/amplifier-bundle-browser-tester@main#subdirectory=behaviors/browser-tester.yaml

hooks:
  - module: hooks-logging
    source: git+https://github.com/microsoft/amplifier-module-hooks-logging@main
---

@anchors:context/system.md

You are a senior software engineer helping the team write clean, tested code.
Always explain your reasoning before making changes.
```

There is no `extends:` key and no top-level `name:`. A bundle names itself under
`bundle:`, pulls in a root and behaviors with `includes:`, and gives every module it
adds a `source:`. Providers are left to settings. Only the root bundle's markdown body
reaches the system prompt, so a root that includes Anchors points back at Anchors'
instructions with an `@mention`.

### Bundle Composition
```
team-coding                      (selected: bundle.active)
   ├── includes: Anchors root         composed first
   ├── includes: browser-tester       a behavior
   └── team-coding's own keys         the includer wins
+ app bundles                    (bundle.app, composed after the selected bundle)
+ settings                       (providers; global < project < local < session)
```

Composition is a list of includes, not a single-parent chain. Modules merge by module
ID, agents by name, `session` deep-merges, context accumulates, and the later
instruction replaces the earlier one.

**Docs for this layer:**
- [Bundles](../index.html#bundles)
- [Configuration](../index.html#configuration)
- [Architecture Overview](../index.html#architecture)

**Time to master:** 1-2 hours

---

## Layer 3: EXTEND

**Goal:** Write custom modules.

**You know:**
- Module interfaces
- Event system
- How to package and distribute

**You need:**

### Custom Tool
```python
# my_tool/__init__.py
from amplifier_core.models import ToolResult

class MyCustomTool:  # Tool is a Protocol: no base class to inherit
    @property
    def name(self) -> str:
        return "my_custom_tool"

    @property
    def description(self) -> str:
        return "Does something useful"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "input": {"type": "string", "description": "The input"}
            },
            "required": ["input"]
        }

    async def execute(self, input: dict) -> ToolResult:
        # Do the thing
        result = process(input["input"])
        return ToolResult(output=result)

async def mount(coordinator, config):
    await coordinator.mount("tools", MyCustomTool(), name="my_custom_tool")
```

### Custom Hook
```python
# my_hook/__init__.py
from amplifier_core.models import HookResult

async def my_security_hook(event: str, data: dict) -> HookResult:
    if is_dangerous(data["tool_name"], data["tool_input"]):
        return HookResult(action="deny", reason="Blocked by policy")
    return HookResult(action="continue")

async def mount(coordinator, config):
    coordinator.hooks.register("tool:pre", my_security_hook, priority=0, name="my-security-hook")
```

### Package and Use
```toml
# pyproject.toml
[project.entry-points."amplifier.modules"]
tool-my-custom = "my_tool:mount"
```

```yaml
# In your bundle or behavior
tools:
  - module: tool-my-custom
    source: git+https://github.com/<org>/<repo>@main#subdirectory=modules/tool-my-custom
```

Installing the package is not enough: the module has to be listed, with its `source:`,
in a bundle or behavior that the session composes.

**Learn this layer:**
- [amplifier-modulebuilder-skill](https://github.com/michaeljabbour/amplifier-modulebuilder-skill) - Agent Skill teaching module development (community repository, last updated December 2025; it predates the current bundle format)

**Docs for this layer:**
- [Creating Modules](../index.html#creating-modules)
- [Tool Interface](../index.html#tool-interface)
- [Hook Interface](../index.html#hook-interface)
- [Event Reference](../index.html#events)

**Time to master:** A few days

---

## Layer 4: EMBED

**Goal:** Use Amplifier as a library in your application.

**You know:**
- Python API
- Session management
- Event handling
- Integration patterns

**You need:**

### Basic Embedding
```python
import asyncio
from pathlib import Path
from amplifier_foundation import load_bundle

async def main():
    # Load a root bundle and a provider bundle
    anchors = await load_bundle(
        "git+https://github.com/microsoft/amplifier-foundation@main"
        "#subdirectory=bundles/anchors/bundle.md"
    )
    provider = await load_bundle(
        "git+https://github.com/microsoft/amplifier-foundation@main"
        "#subdirectory=providers/anthropic-sonnet.yaml"
    )

    composed = anchors.compose(provider)      # later overrides earlier
    prepared = await composed.prepare()       # do once; downloads and activates modules

    # Run a prompt
    session = await prepared.create_session(session_cwd=Path.cwd())
    async with session:
        response = await session.execute("Help me understand this code")
        print(response)                       # execute() returns a str

asyncio.run(main())   # requires ANTHROPIC_API_KEY
```

### Streaming

There is no `session.stream()`. Streaming output arrives as hook events
(`content_block:delta` and the rest of the `content_block:*` family), so a host
registers a handler and forwards what it receives to its own UI:

```python
from amplifier_core.models import HookResult

async def forward_to_ui(event: str, data: dict) -> HookResult:
    await ui.send(event, data)       # ui is your transport; payload is set by the emitting module
    return HookResult(action="continue")

async def stream_response(prepared):
    session = await prepared.create_session()
    session.coordinator.hooks.register("content_block:delta", forward_to_ui, name="ui-stream")
    async with session:
        await session.execute("Explain this file")
```

### Event Handling
```python
async def with_custom_handling(prepared):
    session = await prepared.create_session()
    session.coordinator.hooks.register("tool:pre", my_approval_handler, name="approval")
    session.coordinator.hooks.register("tool:post", my_logging_handler, name="logging")

    async with session:
        await session.execute("Do something complex")
```

Handlers have the same shape as a hook module: `async def handler(event: str, data: dict) -> HookResult`.

**Learn this layer:**
- [amplifier-foundation examples](https://github.com/microsoft/amplifier-foundation/tree/main/examples) - runnable scripts; `examples/08_cli_application.py` covers CLI application architecture

**Docs for this layer:**
- [Python API](../index.html#python-api)
- [Embedding Guide](../index.html#embedding)
- [Embedding Amplifier: A Case Study](./07-desktop-case-study.md)

**Time to master:** Days to weeks, depending on complexity

---

## Layer 5: UNDERSTAND

**Goal:** Know the internals. Contribute. Build derivatives.

**You know:**
- Internal architecture
- Design decisions and trade-offs
- How to modify core behavior
- Contributing workflow

**You need:**

### Key Concepts
- **Mount Plans:** The compiled representation of a bundle
- **Module Resolution:** How modules are found (entry points, cache, local)
- **Hook Registry:** Dispatches every event to registered handlers, in priority order
- **Context Strategies:** Different approaches to managing conversation history

### Architecture Deep Dive
```
┌─────────────────────────────────────────────────────────────────────┐
│                        CORE INTERNALS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Config Layer                                                       │
│  ├── amplifier-foundation  Bundle loading (markdown + YAML),        │
│  │                         includes composition, source resolution, │
│  │                         @mentions, session factory               │
│  └── amplifier-core        Module discovery, loader, source contracts │
│                                                                     │
│  Runtime Layer                                                      │
│  ├── Coordinator           Mount points, capabilities, hook registry│
│  ├── Session               Single conversation runtime              │
│  ├── ModuleLoader          Dynamic module instantiation             │
│  └── HookRegistry          Event dispatch to registered handlers    │
│                                                                     │
│  Module Layer                                                       │
│  ├── Provider interface    complete(ChatRequest) → ChatResponse     │
│  ├── Tool interface        execute(input: dict) → ToolResult        │
│  ├── Hook interface        __call__(event, data) → HookResult       │
│  ├── Context interface     get/add messages, compact                │
│  └── Orchestrator interface  execute() → run the loop               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Hooks observe and may intervene | One ordered place for policy: a handler can continue, deny, modify, inject context or ask the user |
| Config cascades, bundles compose | Flexibility without complexity |
| Events are ordered | Enables reliable debugging and audit |
| Modules are isolated | Composability without interference |
| Context compacts at a threshold | Long sessions stay usable; compaction is announced with `context:*` events |

**Docs for this layer:**
- Source code (the ultimate documentation)
- [Architecture](../index.html#architecture)
- [Contributing](../index.html#contributing)
- [How Data Flows](./01-data-flow.md)
- [The Certainties](./02-certainties.md)

**Time to master:** Ongoing

---

## Finding Your Layer

| If you want to... | You need Layer... |
|-------------------|-------------------|
| Use Amplifier for coding help | 1 (Use) |
| Set up team standards | 2 (Configure) |
| Add a custom tool | 3 (Extend) |
| Build a product on Amplifier | 4 (Embed) |
| Contribute to Amplifier | 5 (Understand) |

---

## Progression Path

```
START
  │
  ▼
[Layer 1: Use]
  │
  │ "I want to customize this"
  ▼
[Layer 2: Configure]
  │
  │ "I need something that doesn't exist"
  ▼
[Layer 3: Extend]
  │
  │ "I want to build my own app"
  ▼
[Layer 4: Embed]
  │
  │ "I want to understand everything"
  ▼
[Layer 5: Understand]
```

Most people oscillate between Layers 1-2. That's the design goal - you shouldn't need to understand internals to get value.

---

**Previous:** [5-Minute Understanding](./05-quick-start.md)
**Next:** [Embedding Amplifier: A Case Study →](./07-desktop-case-study.md) - Real apps embedding the kernel via the Foundation factory
