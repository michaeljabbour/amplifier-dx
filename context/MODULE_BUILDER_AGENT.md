# Amplifier Module Builder Agent Guide

**Purpose**: Authoritative guide for AI coding agents building Amplifier modules  
**Version**: 1.3.0
**Last Updated**: November 18, 2026
**Verified against**: `amplifier-core` 2.0.2 and `amplifier-foundation` 1.0.0 (the installed Amplifier CLI build). The tool, hook, test and in-process session examples in sections 2 and 3 were executed against that build; bundle URIs, publishing steps and anything else not executed are labelled illustrative or unverified.

---

## Quick Reference

```
Module Lifecycle: Create → Test → Publish → Bundle → Consume

Git is the registry.
Entry-point key = Module ID (non-negotiable).
mount() is `async def mount(coordinator, config)`; it may return a cleanup callable.
Tools:  await coordinator.mount("tools", tool, name=tool.name)
Hooks:  coordinator.hooks.register(event, handler, priority=..., name=...)   (not mounted)
Bundles compose on top of foundation.
CLI is optional.
```

---

## 1. Understanding Amplifier Architecture

### The Three Layers

```
┌────────────────────────────────────────────────────────────┐
│ APPLICATION LAYER (amplifier-app-cli, amplifierd)          │
│ • UX systems, settings, bundle loading, @mentions         │
├────────────────────────────────────────────────────────────┤
│ KERNEL LAYER (amplifier-core)                              │
│ • Session, Coordinator, HookRegistry, ModuleLoader         │
├────────────────────────────────────────────────────────────┤
│ MODULE LAYER (amplifier-module-*)                          │
│ • Providers, Tools, Hooks, Orchestrators, Context          │
└────────────────────────────────────────────────────────────┘
```

### Module Types

| Type | Protocol | Mount Point | Examples |
|------|----------|-------------|----------|
| **Tool** | `Tool` | `tools` | filesystem, bash, web, memory |
| **Hook** | `HookHandler` | none: `coordinator.hooks.register()` | logging, approval, redaction |
| **Provider** | `Provider` | `providers` | anthropic, openai, azure |
| **Orchestrator** | `Orchestrator` | `orchestrator` | loop-basic, loop-streaming |
| **Context** | `ContextManager` | `context` | context-simple |

`await coordinator.mount("hooks", ...)` raises `ValueError: Hooks should be registered directly with the HookRegistry`. Protocol classes live in `amplifier_core.interfaces`.

---

## 2. Creating a Module

### Directory Structure

```
amplifier-module-tool-myfeature/
├── pyproject.toml                    # CRITICAL: Entry point here
├── amplifier_module_tool_myfeature/
│   ├── __init__.py                   # mount() function
│   ├── tools.py                      # Tool implementations
│   └── store.py                      # Optional: persistence
├── tests/
│   ├── conftest.py
│   └── test_tools.py
└── README.md
```

### pyproject.toml (CRITICAL)

```toml
[project]
name = "amplifier-module-tool-myfeature"
version = "0.1.0"
description = "My feature tool for Amplifier"
requires-python = ">=3.11"
dependencies = ["amplifier-core>=2.0,<3"]

[project.entry-points."amplifier.modules"]
# CRITICAL: Entry-point key IS the module ID
# This MUST match how users reference it in bundles
tool-myfeature = "amplifier_module_tool_myfeature:mount"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**RULES (non-negotiable)**:
1. Entry-point key (`tool-myfeature`) = Module ID used everywhere
2. Value points to the `mount` function, not a class
3. Naming convention: `tool-*`, `hooks-*`, `provider-*`, `context-*`
4. `mount` is an `async def` (the CLI validator checks this: "mount() is async with correct signature")

Pin the kernel to the major version you tested (`amplifier-core>=2.0,<3` above is an example; the ecosystem modules typically list plain `amplifier-core`).

### The mount() Function

```python
# amplifier_module_tool_myfeature/__init__.py

from typing import Any
from .tools import AddItemTool, ListItemsTool, MyFeatureStore

async def mount(coordinator, config: dict[str, Any] | None = None):
    """Mount this module's tools on the coordinator.
    
    Args:
        coordinator: The kernel's module coordinator
        config: Optional configuration from bundle

    Returns:
        None, or a cleanup callable (sync or async, no arguments).
    """
    config = config or {}
    
    store = MyFeatureStore(max_items=config.get("max_items", 1000))

    # Mount each tool by name on the "tools" mount point.
    # coordinator.mount() is a coroutine: it must be awaited.
    for tool in (AddItemTool(store), ListItemsTool(store)):
        await coordinator.mount("tools", tool, name=tool.name)

    async def cleanup() -> None:
        store.close()

    return cleanup
```

Contract (verified on 2.0.2; authoritative text is `CONTRACTS.md` in `microsoft/amplifier-core`):

- `mount` is a module-level free function, called once per module while the coordinator is only partially composed (earlier phases are mounted, later ones may not be).
- Return `None` (nothing to clean up) or a zero-argument callable. The kernel calls it at `session.cleanup()`, in reverse registration order; async callables are awaited. A non-callable return value (such as a tool instance) is silently ignored and mounts nothing.
- There is no `coordinator.register_tool()`. Do not invent coordinator methods; the real surface is `mount`, `unmount`, `get`, `register_capability`, `get_capability`, `register_cleanup`, `register_contributor`, `collect_contributions`, and `hooks`.
- A module whose `mount()` raises is logged and skipped for providers, tools and hooks; the session still starts and the kernel emits `module:load_failed`. Do not assume everything mounted.
- Optional: `async def on_session_ready(coordinator)` at module level (same module as `mount`, or the package `__init__.py`) runs once after all modules have mounted. Use it only for cross-module wiring; it has no timeout, so never block in it.

### Tool Implementation

```python
# amplifier_module_tool_myfeature/tools.py

from typing import Any
from amplifier_core import ToolResult

class MyFeatureStore:
    """Shared state for the module's tools (not a tool itself)."""

    def __init__(self, max_items: int):
        self.max_items = max_items
        self.items: list[dict[str, str]] = []
        self.closed = False

    def add(self, content: str, category: str) -> int:
        if len(self.items) >= self.max_items:
            raise ValueError("store is full")
        self.items.append({"content": content, "category": category})
        return len(self.items)

    def close(self) -> None:
        self.closed = True

class AddItemTool:
    """Individual tool - one action."""
    
    def __init__(self, store: MyFeatureStore):
        self.store = store
    
    @property
    def name(self) -> str:
        return "add_item"
    
    @property
    def description(self) -> str:
        return "Add an item to the list"
    
    @property
    def input_schema(self) -> dict:
        """JSON Schema the model sees. Optional in the protocol (defaults to {}),
        but without it the model has no argument names to call you with."""
        return {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": "The item content"
                },
                "category": {
                    "type": "string",
                    "description": "Optional category"
                }
            },
            "required": ["content"]
        }
    
    async def execute(self, input: dict[str, Any]) -> ToolResult:
        """Execute the tool action."""
        content = input.get("content")
        if not content:
            return ToolResult(success=False, error={"message": "content is required"})
        try:
            item_id = self.store.add(content, input.get("category", "general"))
        except ValueError as e:
            return ToolResult(success=False, error={"message": str(e), "type": "ValueError"})
        return ToolResult(success=True, output={"id": item_id, "stored": True})

class ListItemsTool:
    def __init__(self, store: MyFeatureStore):
        self.store = store

    @property
    def name(self) -> str:
        return "list_items"

    @property
    def description(self) -> str:
        return "List stored items"

    @property
    def input_schema(self) -> dict:
        return {"type": "object", "properties": {}}

    async def execute(self, input: dict[str, Any]) -> ToolResult:
        return ToolResult(success=True, output={"items": list(self.store.items)})
```

`ToolResult` is the kernel's Pydantic model: import it from `amplifier_core`; do not define your own. Its fields are `success: bool = True`, `output: Any | None`, `error: dict[str, Any] | None` and `content` (optional text/image blocks). `error` must be a dict: `ToolResult(error="text")` raises a `ValidationError`. Report failures by returning `success=False` with an `error` dict instead of raising.

### Hook Implementation

```python
# amplifier_module_hooks_myfeature/__init__.py

from typing import Any
from amplifier_core import HookResult

async def mount(coordinator, config: dict[str, Any] | None = None):
    """Register hook handlers on the coordinator's hook registry."""
    config = config or {}
    
    # Event names must be exact. There is no wildcard subscription
    # ("tool:*" matches nothing); list every event you want.
    events = config.get("events", ["tool:pre", "tool:post"])
    blocked = config.get("blocked_tools", [])

    async def handler(event: str, data: dict) -> HookResult:
        if event == "tool:pre" and data.get("tool_name") in blocked:
            return HookResult(action="deny", reason=f"{data['tool_name']} is blocked")

        # Look the capability up when the event fires: the app may register
        # it after mount().
        relay = coordinator.get_capability("relay")
        if relay:
            await relay(event, data)
        return HookResult(action="continue")

    # register() returns an unregister callable.
    unregisters = [
        coordinator.hooks.register(
            event, handler, priority=config.get("priority", 100), name="hooks-myfeature"
        )
        for event in events
    ]

    def cleanup() -> None:
        for unregister in unregisters:
            unregister()

    return cleanup
```

`HookRegistry.register(event, handler, priority=0, name=None)`: lower priority numbers run first. Actions: `continue`, `deny`, `modify`, `inject_context`, `ask_user`; precedence is `deny` > `ask_user` > `inject_context` > `modify` > `continue`. A `deny` short-circuits later handlers. `modify` replaces the whole event `data` dict for later handlers, so copy it: `HookResult(action="modify", data={**data, "delta": new})`. Whether a result is honored is up to the emitter; `tool:pre` `deny`/`ask_user` is honored by orchestrators that follow the orchestrator contract.

---

## 3. Testing

### Local Testing (No Install)

```bash
# Structural check against the contract. Point at the PACKAGE directory
# (the one containing __init__.py), not the repo root.
amplifier module validate ./amplifier_module_tool_myfeature --type tool

# Point the module ID at your checkout while developing
amplifier source add tool-myfeature . --local

# Or, for one shell session only
export AMPLIFIER_MODULE_TOOL_MYFEATURE=$(pwd)

# Unit tests
uv run pytest
```

`amplifier module validate` on the repo root fails with `No __init__.py found`; give it the package directory. Validating the example tool module below reports 13/13 checks passed on core 2.0.2, and the hook module 4/4. `--behavioral` additionally runs pytest-based behavioral tests.

### Test Structure

Use `MockCoordinator` from `amplifier_core.testing`. It subclasses the real Rust-backed coordinator, so `mount`, `get`, `hooks`, and capabilities behave as in a session. Do not hand-write a fake coordinator: a fake cannot catch calls to methods the real one lacks (the old `register_tool`).

```python
# tests/test_tools.py
import asyncio
from amplifier_core.testing import MockCoordinator
from amplifier_module_tool_myfeature import mount

def test_mount_and_execute():
    async def scenario():
        coordinator = MockCoordinator()
        cleanup = await mount(coordinator, {"max_items": 1})

        tools = coordinator.get("tools")          # dict: name -> tool
        assert set(tools) == {"add_item", "list_items"}

        ok = await tools["add_item"].execute({"content": "x"})
        assert ok.success and ok.output["stored"] is True

        missing = await tools["add_item"].execute({})
        assert missing.success is False and missing.error["message"]

        full = await tools["add_item"].execute({"content": "y"})
        assert full.success is False

        await cleanup()                            # cleanup is async here

    asyncio.run(scenario())

def test_hook_denies_blocked_tool():
    from amplifier_module_hooks_myfeature import mount as mount_hook

    async def scenario():
        coordinator = MockCoordinator()
        cleanup = await mount_hook(coordinator, {"blocked_tools": ["bash"]})
        denied = await coordinator.hooks.emit("tool:pre", {"tool_name": "bash"})
        assert denied.action == "deny"
        allowed = await coordinator.hooks.emit("tool:pre", {"tool_name": "ls"})
        assert allowed.action == "continue"
        cleanup()                                  # unregisters the handlers
        after = await coordinator.hooks.emit("tool:pre", {"tool_name": "bash"})
        assert after.action == "continue"

    asyncio.run(scenario())
```

Sync test functions wrapping `asyncio.run` need only `pytest`. If you prefer `async def` tests, add `pytest-asyncio` to your module's dev dependencies; core does not ship it. Neither `pytest` nor `pytest-asyncio` is installed in the Amplifier CLI environment itself.

### Testing Through a Real Session

To test wiring (mount order, cleanup at teardown, hooks seeing real events), build an `AmplifierSession` and give its coordinator a loader that serves your `mount` functions directly. Set the loader on `session.coordinator.loader`: on core 2.0 (`AmplifierSession` is the Rust-backed session) the `loader=` constructor argument is ignored. Call `await session.initialize()` before `execute()`.

```python
from amplifier_core import AmplifierSession, ModuleLoader

class InProcessLoader(ModuleLoader):
    def __init__(self, mounts, **kwargs):
        super().__init__(**kwargs)
        self.mounts = mounts                       # {module_id: async mount(coordinator, config)}

    async def load(self, module_id, config=None, source_hint=None, coordinator=None):
        mount_fn = self.mounts[module_id]
        async def mount_with_config(coord):
            return await mount_fn(coord, config or {})
        return mount_with_config                   # load() returns a mount callable

session = AmplifierSession({
    "session": {"orchestrator": "orch", "context": "ctx"},
    "tools": [{"module": "tool-myfeature"}],
})
session.coordinator.loader = InProcessLoader(
    {"orch": orch_mount, "ctx": ctx_mount, "tool-myfeature": mount},   # your stub mounts
    coordinator=session.coordinator,
)
await session.initialize()
...
await session.cleanup()    # emits session:end, then runs your cleanup callables
```

Verified on 2.0.2: with stub orchestrator/context mounts, the tool and hook modules mounted, `tool:pre`/`tool:post`/`session:end` reached a spy hook, a `deny` from the hook was returned to the orchestrator, and the tool's cleanup ran at `session.cleanup()`. (A stub orchestrator that never calls a provider ran without any provider mounted on 2.0.2; a real orchestrator such as `loop-streaming` needs one.)

---

## 4. Publishing

### Step 1: Git Repository

```bash
git init
git add .
git commit -m "Initial implementation"
git remote add origin https://github.com/you/amplifier-module-tool-myfeature.git
git push -u origin main
```

### Step 2: Tag Release (REQUIRED for stability)

```bash
git tag v0.1.0
git push origin v0.1.0
```

Tags are the stability contract. Users reference tags, not branches, for production.

---

## 5. Bundles (Composition Model)

### Key Principle: Bundles Compose ON TOP of Foundation

Bundles don't merge into `amplifier-foundation` - they compose on top of it.

```yaml
# your-bundle/bundle.yaml
bundle:
  name: my-app-bundle
  version: 1.0.0
  description: Bundle for my application

# Compose on top of foundation. Each include is `- bundle: <uri>`; it can be a
# git URI (with #subdirectory=) or a namespaced reference such as foundation:behaviors/logging.
includes:
  - bundle: git+https://github.com/microsoft/amplifier-foundation@main#subdirectory=bundles/anchors/bundle.md

# Add your modules
tools:
  - module: tool-myfeature
    source: git+https://github.com/you/amplifier-module-tool-myfeature@v0.1.0
    config:
      max_items: 500

hooks:
  - module: hooks-myfeature
    source: git+https://github.com/you/amplifier-module-hooks-myfeature@v0.1.0
    config:
      events: [tool:pre, tool:post]
```

`you/...` URLs are placeholders. The `tools:`/`hooks:` shape (`module`, `source`, `config`) was loaded with `amplifier_foundation.load_bundle` on 1.0.0; the git `includes:` URI above is illustrative and was not fetched. Installing a package is not enough: a module is mounted only when the active bundle lists it.

### Bundle Structure

```
amplifier-bundle-my-app/
├── README.md
├── bundle.yaml          # Main bundle definition
└── docs/
    └── USAGE.md
```

### Sharing Bundles

To share with the community:
1. Create bundle per [BUNDLE_GUIDE.md](https://github.com/microsoft/amplifier-foundation/blob/main/docs/BUNDLE_GUIDE.md)
2. Add to [MODULES.md](https://github.com/microsoft/amplifier/blob/main/docs/MODULES.md) bundles section

### Loading Bundles

```python
import asyncio
from pathlib import Path
from amplifier_foundation import load_bundle

async def main():
    # Load your composed bundle (placeholder URL)
    bundle = await load_bundle("git+https://github.com/you/amplifier-bundle-my-app@v1.0.0")

    # Every step is a coroutine: await prepare() (downloads and activates
    # modules; do it once) and await create_session()
    prepared = await bundle.prepare()
    session = await prepared.create_session(session_cwd=Path.cwd())

    async with session:                      # initializes the session; cleans up on exit
        print(await session.execute("use my feature"))

asyncio.run(main())    # needs a provider in the bundle and its API key
```

`Bundle.prepare` and `PreparedBundle.create_session` are `async def` in `amplifier-foundation` 1.0.0 (`bundle/_dataclass.py`, `bundle/_prepared.py`), so `bundle.prepare().create_session()` fails. `load_bundle`, `prepare()` and `create_session()` were not run end to end here (they need network and a provider key); the bundle-file parse was.

---

## 6. Consumption

### In a Markdown Bundle

```yaml
---
bundle:
  name: my-bundle
  version: 1.0.0
tools:
  - module: tool-myfeature
    source: git+https://github.com/you/amplifier-module-tool-myfeature@v0.1.0
    config:
      max_items: 500
---
System prompt here (the markdown body of a root bundle).
```

### In a YAML Bundle

```yaml
# bundle.yaml
bundle:
  name: my-bundle
  version: 1.0.0

tools:
  - module: tool-myfeature
    source: git+https://github.com/you/amplifier-module-tool-myfeature@v0.1.0
```

---

## 7. Common Mistakes

### ❌ Wrong Entry Point

```toml
# WRONG - points to class, not mount function
tool-myfeature = "amplifier_module_tool_myfeature:MyFeatureTool"

# CORRECT - points to mount function
tool-myfeature = "amplifier_module_tool_myfeature:mount"
```

### ❌ Module ID Mismatch

```toml
# In pyproject.toml
tool-my-feature = "..."  # Note: hyphen

# In bundle (WRONG - underscore)
tools:
  - module: tool_my_feature  # This won't resolve!

# CORRECT - must match exactly
tools:
  - module: tool-my-feature
```

### ❌ Missing mount() Return

```python
# WRONG - returns the instance; a non-callable return value is ignored, nothing is mounted
async def mount(coordinator, config=None):
    return MyTool()

# WRONG - sync def: coordinator.mount() is a coroutine and cannot be awaited here
def mount(coordinator, config=None):
    coordinator.mount("tools", MyTool(), name="my_tool")   # creates a coroutine that never runs

# CORRECT - mounts on the coordinator; returns None or a cleanup callable
async def mount(coordinator, config=None):
    tool = MyTool(config or {})
    await coordinator.mount("tools", tool, name=tool.name)
```

### ❌ Raising in Hooks to Block

```python
# WRONG - an exception is logged and the handler is skipped; it does NOT block anything
async def handler(event, data):
    if something_wrong:
        raise Exception("Bad!")

# CORRECT - return a result; deny is how a hook blocks
async def handler(event, data):
    if something_wrong:
        return HookResult(action="deny", reason="Bad!")
    return HookResult(action="continue")
```

Verified on 2.0.2: a handler that raised was logged ("Hook handler error ... handler failed") and skipped, and later handlers still ran. That is isolation, not enforcement; a security check that raises fails open.

### ❌ Module with Transport Knowledge

```python
# WRONG - module knows about specific transport
async def handler(event, data):
    await websocket.send_json(data)  # Module shouldn't know this!

# CORRECT - module uses capability injection
async def handler(event, data):
    broadcast = coordinator.get_capability("broadcast")
    if broadcast:
        await broadcast(event, data)  # Transport-agnostic
```

---

## 8. Event Names Reference

`amplifier_core.events.ALL_EVENTS` holds 43 canonical names (checked on 2.0.2). Import the constants (`from amplifier_core.events import TOOL_PRE`) rather than typing strings. Register each event you want by its exact name; unknown or wildcard names (`tool:*`, `prompt:pre`, `command:pre`) are never emitted.

| Event | Emitted by | Notes |
|-------|-----------|-------|
| `session:start` / `session:resume` | kernel | First `execute()` of a new / resumed session |
| `session:fork` | kernel | Child session initialized (`parent`, `session_id`) |
| `session:end` | kernel | `session.cleanup()`, before your cleanup callables (`session_id`, `status`) |
| `module:load_failed`, `module:on_session_ready_failed` | kernel | A provider/tool/hook failed to mount; an `on_session_ready` raised |
| `prompt:submit`, `prompt:complete` | orchestrator | Orchestrator-defined |
| `provider:request`, `provider:response` | orchestrator | Contract names; `loop-streaming` 1.0.0 does not emit `provider:response` |
| `llm:request`, `llm:response` | provider | Kernel adds a correlating `request_id` |
| `content_block:start` / `delta` / `end` | orchestrator | Streaming blocks |
| `tool:pre`, `tool:post`, `tool:error` | orchestrator | `tool_name`, `tool_input` (`tool_result` on post) |
| `orchestrator:complete`, `execution:start`, `execution:end` | orchestrator | Required by the orchestrator contract |

Other canonical names (`plan:*`, `thinking:*`, `context:*`, `approval:*`, `cancel:*`, `artifact:*`, `policy:violation`, `user:notification`, `provider:error/retry/throttle/resolve`) exist in `ALL_EVENTS`; check which module emits them before relying on them.

**Can a hook block?** The registry returns the combined `HookResult` for any event, but only the emitter acts on it. `tool:pre` is the event where orchestrators honor `deny` and `ask_user`. Treat a `deny` on any other event as advisory unless you have read the emitting module.

---

## 9. Verification Checklist

Before publishing, verify:

- [ ] `pyproject.toml` entry-point key matches module ID exactly
- [ ] `async def mount(coordinator, config)` exists and the entry point references it
- [ ] Tools are mounted with `await coordinator.mount("tools", tool, name=...)`; hooks via `coordinator.hooks.register(...)`; neither is returned from `mount()`
- [ ] Any resource you open is closed by the cleanup callable `mount()` returns
- [ ] All tool `execute()` methods are `async`
- [ ] All tools have `name`, `description`, `input_schema` and `execute()`, and return `amplifier_core.ToolResult`
- [ ] Hooks register exact event names (no wildcards) and return `HookResult`
- [ ] `amplifier module validate ./<package_dir> --type <type>` passes
- [ ] Tests pass: `uv run pytest`
- [ ] Git tag created: `git tag v0.1.0`
- [ ] README documents usage and configuration

---

## 10. Quick Commands

```bash
# Create module (manual). The installed CLI has no scaffolding command:
# `amplifier module` offers add, current, list, override, remove, show, update, validate.
mkdir amplifier-module-tool-myfeature
cd amplifier-module-tool-myfeature
uv init --lib   # then replace pyproject.toml with the one in section 2 (entry point, build backend)

# Validate (point at the package directory containing __init__.py)
amplifier module validate ./amplifier_module_tool_myfeature --type tool

# Test locally
export AMPLIFIER_MODULE_TOOL_MYFEATURE=$(pwd)
uv run pytest

# Publish
git tag v0.1.0 && git push origin v0.1.0

# Verify the entry point resolves to the mount function (after installing the package)
python -c "from importlib.metadata import entry_points; print([e for e in entry_points(group='amplifier.modules') if e.name == 'tool-myfeature'])"
```

---

## 11. Ecosystem Modules

The Amplifier ecosystem includes official and community modules. For the current catalog, see:

- **Official modules**: https://github.com/microsoft/amplifier/blob/main/docs/MODULES.md
- **Foundation bundles**: https://github.com/microsoft/amplifier-foundation
- **Bundle guide**: https://github.com/microsoft/amplifier-foundation/blob/main/docs/BUNDLE_GUIDE.md

### Module Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Orchestrators** | Execution loop patterns | loop-basic, loop-streaming |
| **Providers** | LLM API connections | anthropic, openai, azure |
| **Tools** | Executable actions | filesystem, bash, web, search |
| **Hooks** | Event observers | logging, approval, redaction |
| **Context** | Message management | context-simple |

### Finding Modules

1. Check official MODULES.md for curated modules
2. Search GitHub for `amplifier-module-*`
3. Ask in community channels

### Contributing Modules

To list your module in the ecosystem:
1. Ensure it follows this guide
2. Open PR to MODULES.md
3. Module should be general-purpose (not app-specific)

---

## 12. Decision Guide: Bundles, Modules, and Ecosystem Participation

This section helps you make the right decisions about where your code belongs and how to participate in the ecosystem.

### Decision Tree: Where Does My Code Go?

```
START: I need to add functionality to my Amplifier app
           │
           ▼
    ┌──────────────────────────────────────┐
    │ Is this functionality reusable by    │
    │ OTHER Amplifier apps?                │
    └──────────────────────────────────────┘
           │
     ┌─────┴─────┐
     │           │
    YES          NO
     │           │
     ▼           ▼
┌─────────┐  ┌─────────────────────────────┐
│ Create  │  │ Keep in your app's codebase │
│ MODULE  │  │ (not a module)              │
└────┬────┘  └─────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ Is this module general-purpose       │
│ (useful to the broader community)?   │
└──────────────────────────────────────┘
     │
┌────┴────┐
│         │
YES       NO
│         │
▼         ▼
┌─────────────────┐  ┌─────────────────────────┐
│ Publish module  │  │ Publish module in your  │
│ to community    │  │ own repo, don't add to  │
│ + add to        │  │ MODULES.md              │
│ MODULES.md      │  └─────────────────────────┘
└─────────────────┘
```

### Decision Tree: Bundle Location

```
START: I need a bundle for my app
           │
           ▼
    ┌──────────────────────────────────────┐
    │ Is this bundle app-specific          │
    │ (only useful for my app)?            │
    └──────────────────────────────────────┘
           │
     ┌─────┴─────┐
     │           │
    YES          NO
     │           │
     ▼           ▼
┌─────────────────────┐  ┌─────────────────────────────┐
│ Put bundle.yaml     │  │ Is it useful to others      │
│ IN YOUR APP REPO    │  │ building similar apps?      │
│                     │  └──────────────┬──────────────┘
│ Example:            │           ┌─────┴─────┐
│ my-app/             │          YES          NO
│   bundle.yaml       │           │           │
│   src/              │           ▼           ▼
│   ...               │  ┌────────────────┐  ┌─────────────┐
└─────────────────────┘  │ Create separate│  │ Keep in app │
                         │ bundle repo +  │  │ repo        │
                         │ add to         │  └─────────────┘
                         │ MODULES.md     │
                         └────────────────┘
```

### Key Principle: Bundles Compose, They Don't Merge

**NEVER** try to merge your bundle INTO `amplifier-foundation`. Bundles compose ON TOP of foundation.

```
✅ CORRECT: Composition
┌─────────────────────────────┐
│   Your App Bundle           │  ← Your repo
│   (composes on foundation)  │
├─────────────────────────────┤
│   amplifier-foundation      │  ← Microsoft repo (unchanged)
└─────────────────────────────┘

❌ WRONG: Merging
┌─────────────────────────────┐
│   amplifier-foundation      │  ← DON'T modify this!
│   + your stuff merged in    │
└─────────────────────────────┘
```

### Handling Ecosystem Feedback

When ecosystem maintainers provide feedback on PRs:

**Scenario: "Please don't merge this into foundation"**

This is common and correct! The ecosystem separates concerns:

1. **Accept the feedback gracefully** - it's guiding you to the right pattern
2. **Move your bundle** to your app repo or a separate community repo
3. **Use `includes:`** to compose on top of foundation
4. **Share via MODULES.md** if it's useful to others

**Example Response Pattern**:

```
Original attempt:
  PR to amplifier-foundation with "desktop bundle"
  
Feedback received:
  "Please apply it within your app as a composed bundle"
  
Correct action:
  1. Close the PR (or let maintainer close it)
  2. Create bundle.yaml in your app repo
  3. Use includes: to compose on foundation
  4. Optionally: Create separate bundle repo for community sharing
  5. Optionally: Add to MODULES.md bundles section
```


### Repository Rules (IMPORTANT)

The Amplifier ecosystem follows strict rules about where content lives. See [REPOSITORY_RULES.md](https://github.com/microsoft/amplifier/blob/main/docs/REPOSITORY_RULES.md).

**Key Principle**: Single source of truth - content lives in ONE place.

| Content Type | Correct Repository | Notes |
|--------------|-------------------|-------|
| **MODULES.md** | `microsoft/amplifier` | Entry point repo - ecosystem catalog |
| **Kernel specs** | `microsoft/amplifier-core` | Core mechanisms only |
| **Foundation bundles** | `microsoft/amplifier-foundation` | Curated bundles |
| **App-specific bundles** | Your app repo | NOT in foundation |
| **Module implementations** | Separate module repos | `amplifier-module-*` |

**Common Mistake**: Opening PRs to the wrong repo.

```
❌ WRONG: PR to amplifier-core with MODULES.md changes
✅ CORRECT: PR to microsoft/amplifier for MODULES.md

❌ WRONG: PR to amplifier-foundation with app bundle
✅ CORRECT: Bundle in your app repo, optionally share separately
```

### Example: An Application Bundle

Here's how an application bundle can be structured. This is illustrative: `<org>`, `hooks-event-broadcast` and `tool-memory` are placeholders for your own published modules, and the include URI was not fetched. The structure (`bundle:` includes, `session.orchestrator.module/source/config`, `hooks`/`tools` entries) matches the foundation bundles in the installed build.

```yaml
# my-app/bundle.yaml
bundle:
  name: my-app
  version: 1.0.0
  description: Desktop application bundle

# COMPOSE on foundation (don't merge into it)
includes:
  - bundle: git+https://github.com/microsoft/amplifier-foundation@main#subdirectory=bundles/anchors/bundle.md

# Desktop-specific additions
session:
  orchestrator:
    module: loop-streaming
    source: git+https://github.com/microsoft/amplifier-module-loop-streaming@main
    config:
      extended_thinking: true

hooks:
  # Your own hook module: forwards events to the app. It registers each listed
  # event by exact name; wildcards such as content_block:* or tool:* do not exist.
  - module: hooks-event-broadcast
    source: git+https://github.com/<org>/amplifier-module-hooks-event-broadcast@v0.1.0
    config:
      events: [content_block:start, content_block:delta, content_block:end, tool:pre, tool:post, tool:error, orchestrator:complete]

tools:
  # Persistent memory across sessions
  - module: tool-memory
    source: git+https://github.com/<org>/amplifier-module-tool-memory@v0.1.0
```

**Why this structure works**:
- Bundle lives in the desktop app repo (not foundation)
- Uses `includes:` to compose on foundation
- Adds desktop-specific modules via source URLs
- Modules are published separately (can be used by other apps)

### When to Create a Separate Bundle Repo

Create a separate `amplifier-bundle-*` repo when:

| Condition | Action |
|-----------|--------|
| Multiple apps could use your bundle | Separate repo |
| You want community visibility | Separate repo + MODULES.md |
| Bundle is app-specific | Keep in app repo |
| Bundle is experimental | Keep in app repo first |

### Community Sharing Checklist

Before adding to MODULES.md:

- [ ] Module/bundle follows ecosystem patterns
- [ ] Uses capability injection (not hard-coded transports)
- [ ] Works with ANY Amplifier app (not app-specific)
- [ ] Has documentation (README.md)
- [ ] Has tagged releases
- [ ] Follows naming conventions (`amplifier-module-*`, `amplifier-bundle-*`)

### Summary: Ecosystem Participation Levels

| Level | What You Do | Where It Lives |
|-------|-------------|----------------|
| **Private** | App-specific code | Your app repo |
| **Module** | Reusable module | Your module repo |
| **Community Module** | General-purpose module | Your repo + MODULES.md |
| **App Bundle** | App-specific bundle | Your app repo |
| **Community Bundle** | Shareable bundle | Separate bundle repo + MODULES.md |

---

**This guide is the authoritative reference for building Amplifier modules.**
