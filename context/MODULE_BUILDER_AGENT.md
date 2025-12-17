# Amplifier Module Builder Agent Guide

**Purpose**: Authoritative guide for AI coding agents building Amplifier modules  
**Version**: 1.2.0  
**Last Updated**: December 17, 2024

---

## Quick Reference

```
Module Lifecycle: Create → Test → Publish → Bundle → Consume

Git is the registry.
Entry-point key = Module ID (non-negotiable).
Bundles compose on top of foundation.
CLI is optional.
```

---

## 1. Understanding Amplifier Architecture

### The Three Layers

```
┌────────────────────────────────────────────────────────────┐
│ APPLICATION LAYER (amplifier-app-cli, amplifier-desktop)   │
│ • UX systems, settings, profile loading, @mentions         │
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
| **Hook** | `Hook` | `hooks` | logging, approval, redaction |
| **Provider** | `Provider` | `providers` | anthropic, openai, azure |
| **Orchestrator** | `Orchestrator` | `orchestrator` | loop-basic, loop-streaming |
| **Context** | `Context` | `context` | context-simple |

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
dependencies = ["amplifier-core"]

[project.entry-points."amplifier.modules"]
# CRITICAL: Entry-point key IS the module ID
# This MUST match how users reference it in profiles/bundles
tool-myfeature = "amplifier_module_tool_myfeature:mount"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**RULES (non-negotiable)**:
1. Entry-point key (`tool-myfeature`) = Module ID used everywhere
2. Value points to `mount` function, not a class
3. Naming convention: `tool-*`, `hooks-*`, `provider-*`, `context-*`

### The mount() Function

```python
# amplifier_module_tool_myfeature/__init__.py

from amplifier_core.coordinator import ModuleCoordinator
from .tools import MyFeatureTool

def mount(coordinator: ModuleCoordinator, config: dict | None = None) -> None:
    """Mount this module's tools to the coordinator.
    
    Args:
        coordinator: The kernel's module coordinator
        config: Optional configuration from bundle/profile
    """
    config = config or {}
    
    # Create tool instance with config
    tool = MyFeatureTool(
        storage_path=config.get("storage_path", "~/.amplifier/myfeature.db"),
        max_items=config.get("max_items", 1000),
    )
    
    # Register all tools provided by this module
    for t in tool.get_tools():
        coordinator.register_tool(t)
```

### Tool Implementation

```python
# amplifier_module_tool_myfeature/tools.py

from dataclasses import dataclass
from typing import Any

@dataclass
class ToolResult:
    """Standard tool result."""
    output: Any
    error: str | None = None

class MyFeatureTool:
    """Tool implementation following Amplifier protocol."""
    
    def __init__(self, storage_path: str, max_items: int):
        self.storage_path = storage_path
        self.max_items = max_items
    
    def get_tools(self) -> list:
        """Return list of tool definitions."""
        return [
            AddItemTool(self),
            ListItemsTool(self),
            SearchItemsTool(self),
        ]

class AddItemTool:
    """Individual tool - one action."""
    
    def __init__(self, parent: MyFeatureTool):
        self.parent = parent
    
    @property
    def name(self) -> str:
        return "add_item"
    
    @property
    def description(self) -> str:
        return "Add an item to the collection"
    
    def get_schema(self) -> dict:
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
        category = input.get("category", "general")
        
        # Do the thing
        item_id = self.parent._store_item(content, category)
        
        return ToolResult(output={"id": item_id, "stored": True})
```

### Hook Implementation

```python
# amplifier_module_hooks_myfeature/__init__.py

from amplifier_core.coordinator import ModuleCoordinator
from amplifier_core.hooks import HookResult

def mount(coordinator: ModuleCoordinator, config: dict | None = None) -> None:
    """Mount hooks to the coordinator."""
    config = config or {}
    
    events = config.get("events", ["tool:pre", "tool:post"])
    
    for event in events:
        if event.endswith(":*"):
            # Wildcard pattern - expand to specific events
            base = event[:-2]
            for specific in [f"{base}:start", f"{base}:delta", f"{base}:end"]:
                coordinator.hooks.register(
                    event=specific,
                    handler=create_handler(coordinator, config),
                    priority=config.get("priority", 1000),
                    name="hooks-myfeature"
                )
        else:
            coordinator.hooks.register(
                event=event,
                handler=create_handler(coordinator, config),
                priority=config.get("priority", 1000),
                name="hooks-myfeature"
            )

def create_handler(coordinator: ModuleCoordinator, config: dict):
    """Create a handler function for events."""
    
    async def handler(event: str, data: dict) -> HookResult:
        # Do something with the event
        # Example: relay to a capability (transport-agnostic)
        relay = coordinator.get_capability("relay")
        if relay:
            await relay(event, data)
        
        # Return result (allow by default)
        return HookResult(action="continue")
    
    return handler
```

---

## 3. Testing

### Local Testing (No Install)

```bash
# Set environment override
export AMPLIFIER_MODULE_TOOL_MYFEATURE=$(pwd)

# Test with CLI (if available)
amplifier run "test my feature"

# Or run unit tests
uv run pytest
```

### Test Structure

```python
# tests/conftest.py
import pytest

@pytest.fixture
def mock_coordinator():
    """Create a mock coordinator for testing."""
    class MockCoordinator:
        def __init__(self):
            self.tools = {}
            self.hooks = MockHooks()
            self._capabilities = {}
        
        def register_tool(self, tool):
            self.tools[tool.name] = tool
        
        def register_capability(self, name, value):
            self._capabilities[name] = value
        
        def get_capability(self, name):
            return self._capabilities.get(name)
    
    return MockCoordinator()

# tests/test_tools.py
import pytest
from amplifier_module_tool_myfeature import mount

@pytest.mark.asyncio
async def test_mount_registers_tools(mock_coordinator):
    """Test that mount() registers expected tools."""
    mount(mock_coordinator, {})
    
    assert "add_item" in mock_coordinator.tools
    assert "list_items" in mock_coordinator.tools

@pytest.mark.asyncio
async def test_add_item_tool(mock_coordinator):
    """Test add_item tool execution."""
    mount(mock_coordinator, {})
    
    tool = mock_coordinator.tools["add_item"]
    result = await tool.execute({"content": "test content"})
    
    assert result.error is None
    assert result.output["stored"] is True
```

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

# Compose on top of foundation
includes:
  - source: git+https://github.com/microsoft/amplifier-foundation@main
    path: bundle.md

# Add your modules
tools:
  - module: tool-myfeature
    source: git+https://github.com/you/amplifier-module-tool-myfeature@v0.1.0
    config:
      storage_path: ~/.my-app/data.db

hooks:
  - module: hooks-myfeature
    source: git+https://github.com/you/amplifier-module-hooks-myfeature@v0.1.0
```

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
from amplifier_foundation import load_bundle

# Load your composed bundle
bundle = await load_bundle("git+https://github.com/you/amplifier-bundle-my-app@v1.0.0")
session = await bundle.prepare().create_session()
result = await session.execute("use my feature")
```

---

## 6. Consumption

### In a Profile

```yaml
---
name: my-profile
tools:
  - module: tool-myfeature
    source: git+https://github.com/you/amplifier-module-tool-myfeature@v0.1.0
    config:
      storage_path: ~/.amplifier/myfeature.db
      max_items: 500
---
System prompt here.
```

### In a Bundle

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

# In profile (WRONG - underscore)
tools:
  - module: tool_my_feature  # This won't resolve!

# CORRECT - must match exactly
tools:
  - module: tool-my-feature
```

### ❌ Missing mount() Return

```python
# WRONG - returns something
def mount(coordinator, config):
    return MyTool()  # Don't return!

# CORRECT - returns None, registers with coordinator
def mount(coordinator, config):
    tool = MyTool(config)
    for t in tool.get_tools():
        coordinator.register_tool(t)
    # No return statement
```

### ❌ Blocking in Hooks

```python
# WRONG - blocks event chain
async def handler(event, data):
    if something_wrong:
        raise Exception("Bad!")  # This breaks everything

# CORRECT - return result, let chain continue
async def handler(event, data):
    if something_wrong:
        return HookResult(action="deny", reason="Bad!")
    return HookResult(action="continue")
```

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

These are the actual event names from amplifier-core:

| Event | When | Hook Can Block? |
|-------|------|-----------------|
| `session:start` | Session begins | No |
| `session:end` | Session ends | No |
| `prompt:submit` | User message received | No |
| `provider:request` | Before LLM API call | No |
| `provider:response` | After LLM response | No |
| `content_block:start` | Streaming block begins | No |
| `content_block:delta` | Streaming content chunk | No |
| `content_block:end` | Streaming block ends | No |
| `tool:pre` | Before tool execution | **Yes** |
| `tool:post` | After tool execution | No |
| `tool:error` | Tool execution failed | No |
| `orchestrator:complete` | Orchestration done | No |

---

## 9. Verification Checklist

Before publishing, verify:

- [ ] `pyproject.toml` entry-point key matches module ID exactly
- [ ] `mount()` function exists and is correctly referenced
- [ ] `mount()` registers tools/hooks with coordinator (doesn't return them)
- [ ] All tool `execute()` methods are `async`
- [ ] All tools have `name`, `description`, `get_schema()`, `execute()`
- [ ] Tests pass: `uv run pytest`
- [ ] Git tag created: `git tag v0.1.0`
- [ ] README documents usage and configuration

---

## 10. Quick Commands

```bash
# Create module (with CLI)
amplifier module dev create tool-myfeature

# Create module (manual)
mkdir amplifier-module-tool-myfeature
cd amplifier-module-tool-myfeature
uv init --lib

# Test locally
export AMPLIFIER_MODULE_TOOL_MYFEATURE=$(pwd)
uv run pytest

# Publish
git tag v0.1.0 && git push origin v0.1.0

# Verify entry point
python -c "from amplifier_module_tool_myfeature import mount; print(mount)"
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

### Real-World Example: Desktop App Bundle

Here's how the Amplifier Desktop bundle is structured:

```yaml
# amplifier-desktop/sidecar/bundle.yaml
bundle:
  name: amplifier-desktop
  version: 1.0.0
  description: Desktop application bundle

# COMPOSE on foundation (don't merge into it)
includes:
  - source: git+https://github.com/microsoft/amplifier-foundation@main
    path: bundles/default/bundle.md

# Desktop-specific additions
session:
  orchestrator:
    module: loop-streaming
    config:
      extended_thinking: true

hooks:
  # Event broadcast for streaming UI
  - module: hooks-event-broadcast
    source: git+https://github.com/michaeljabbour/amplifier-module-hooks-event-broadcast@v0.1.0
    config:
      events: [content_block:*, tool:*, orchestrator:complete]

tools:
  # Persistent memory across sessions
  - module: tool-memory
    source: git+https://github.com/michaeljabbour/amplifier-module-tool-memory@v0.1.0
```

**Why this is correct**:
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
