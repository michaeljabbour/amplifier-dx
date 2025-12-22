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
│  Layer 2: CONFIGURE    │  Profiles, settings, module selection      │
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
- How to choose profiles
- What the output means

**You need:**
```bash
# Basic usage
amplifier run "List Python files"
amplifier run --profile coding "Help me fix this bug"

# Interactive mode
amplifier chat

# See what's available
amplifier profile list
amplifier module list
```

**Working example:**
- [amplifier-simplecli](https://github.com/michaeljabbour/amplifier-simplecli) - Complete CLI ready to use

**Docs for this layer:**
- [Quickstart](../index.html#quickstart)
- [CLI Reference](../index.html#cli)

**Time to master:** 10 minutes

---

## Layer 2: CONFIGURE

**Goal:** Customize Amplifier for your workflow.

**You know:**
- How settings cascade
- How to write profiles
- How to select modules
- How to share team configurations

**You need:**

### Settings
```yaml
# ~/.amplifier/settings.yaml
default_profile: my-profile
default_model: claude-opus-4-5-20251101
api_keys:
  provider-anthropic: sk-...
```

### Profiles
```yaml
# .amplifier/profiles/team-coding.md
---
name: team-coding
version: "1.0"
extends: coding-base
providers:
  - module: provider-anthropic
    config:
      model: claude-opus-4-5-20251101
tools:
  - module: tool-filesystem
  - module: tool-bash
  - module: tool-grep
hooks:
  - module: hooks-logging
  - module: hooks-approval
---

You are a senior software engineer helping the team write clean, tested code.
Always explain your reasoning before making changes.
```

### Profile Inheritance
```
default
   └── coding-base
        └── team-coding
             └── michael-local (personal tweaks)
```

**Docs for this layer:**
- [Profiles](../index.html#profiles)
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
# my_tool/tool.py
from amplifier_core.types import Tool, ToolResult

class MyCustomTool(Tool):
    name = "my_custom_tool"
    description = "Does something useful"

    def get_schema(self):
        return {
            "type": "object",
            "properties": {
                "input": {"type": "string", "description": "The input"}
            },
            "required": ["input"]
        }

    async def execute(self, input: str) -> ToolResult:
        # Do the thing
        result = process(input)
        return ToolResult(output=result)
```

### Custom Hook
```python
# my_hook/hook.py
from amplifier_core.types import Hook, HookResult

class MySecurityHook(Hook):
    name = "my_security_hook"

    async def on_tool_pre(self, event):
        if is_dangerous(event.tool_call):
            return HookResult(action="deny", reason="Blocked by policy")
        return HookResult(action="allow")
```

### Package and Use
```toml
# pyproject.toml
[project.entry-points."amplifier.tools"]
my_custom_tool = "my_tool.tool:MyCustomTool"
```

```yaml
# In your profile
tools:
  - module: my_custom_tool
```

**Learn this layer:**
- [amplifier-modulebuilder-skill](https://github.com/michaeljabbour/amplifier-modulebuilder-skill) - Agent Skill teaching module development

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
from amplifier_core import Coordinator, Config

# Create coordinator from config
config = Config.from_profile("my-profile")
coordinator = Coordinator(config)

# Run a prompt
async def main():
    async with coordinator.session() as session:
        response = await session.run("Help me understand this code")
        print(response.content)
```

### Streaming
```python
async def stream_response():
    async with coordinator.session() as session:
        async for event in session.stream("Explain this file"):
            if event.type == "delta":
                print(event.content, end="", flush=True)
            elif event.type == "tool_start":
                print(f"\n[Using {event.tool_name}...]")
```

### Event Handling
```python
async def with_custom_handling():
    async with coordinator.session() as session:
        session.on("tool:pre", my_approval_handler)
        session.on("provider:response", my_logging_handler)

        await session.run("Do something complex")
```

**Learn this layer:**
- [amplifier-cli-skill](https://github.com/michaeljabbour/amplifier-cli-skill) - Agent Skill teaching CLI application building
- [amplifier-simplecli](https://github.com/michaeljabbour/amplifier-simplecli) - Working CLI implementation (study the source)

**Docs for this layer:**
- [Python API](../index.html#python-api)
- [Embedding Guide](../index.html#embedding)
- [Amplifier Desktop Case Study](./07-desktop-case-study.md)

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
- **Mount Plans:** The compiled representation of a profile
- **Module Resolution:** How modules are found (entry points, cache, local)
- **Event Bus:** Pub/sub for all system events
- **Context Strategies:** Different approaches to managing conversation history

### Architecture Deep Dive
```
┌─────────────────────────────────────────────────────────────────────┐
│                        CORE INTERNALS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Config Layer                                                       │
│  ├── amplifier-config      Three-tier YAML merging                  │
│  ├── amplifier-profiles    Profile parsing, inheritance             │
│  └── amplifier-collections Module discovery, dependency resolution  │
│                                                                     │
│  Runtime Layer                                                      │
│  ├── Coordinator           Session factory, lifecycle management    │
│  ├── Session               Single conversation runtime              │
│  ├── ModuleLoader          Dynamic module instantiation             │
│  └── EventBus              Event dispatch and subscription          │
│                                                                     │
│  Module Layer                                                       │
│  ├── Provider interface    complete(messages) → response            │
│  ├── Tool interface        execute(input) → result                  │
│  ├── Hook interface        on_event(event) → action                 │
│  ├── Context interface     get/add messages, compact                │
│  └── Orchestrator interface  execute() → run the loop               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Hooks observe, don't transform | Keeps data flow predictable |
| Config cascades, profiles inherit | Flexibility without complexity |
| Events are ordered | Enables reliable debugging and audit |
| Modules are isolated | Composability without interference |
| Context is append-only | Transparency, no hidden state |

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
**Next:** [Amplifier Desktop Case Study →](./07-desktop-case-study.md) - A real-world embedding example
