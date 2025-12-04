const { useState, useEffect, useRef } = React;

// ============================================================================
// AMPLIFIER DEVELOPER EXPERIENCE SITE - FINAL EDITION
// Clean, modern documentation with Contributors Guide & Markdown Export
// ============================================================================

const AmplifierDXSite = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [activeTab, setActiveTab] = useState('consumer');
  const [refTab, setRefTab] = useState('contracts');
  const [contribTab, setContribTab] = useState('overview');
  const [copiedCode, setCopiedCode] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const exportRef = useRef(null);

  const sections = [
    { id: 'home', label: 'Overview' },
    { id: 'quickstart', label: 'Quickstart' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'reference', label: 'Reference' },
    { id: 'cli', label: 'CLI' },
    { id: 'examples', label: 'Examples' },
    { id: 'contribute', label: 'Contribute' },
  ];

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyCode = (code, id) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ============================================================================
  // MARKDOWN EXPORT - Optimized for LLM consumption (agents.md format)
  // ============================================================================
  const generateMarkdown = () => {
    return `# Amplifier

> The ultra-thin kernel for modular AI agents

Amplifier is an open-source AI agent orchestration system from Microsoft built on Linux-kernel philosophy: a tiny, stable center (~2,600 lines) that provides mechanisms, while policies live as swappable modules at the edges.

## Quick Reference

- **Repository**: https://github.com/microsoft/amplifier-core
- **License**: MIT
- **Core Size**: ~2,600 lines
- **Design Philosophy**: Mechanism over policy

## Installation

\`\`\`bash
pip install amplifier-core amplifier-app-cli
\`\`\`

## Basic Usage

\`\`\`bash
# Set API key
export ANTHROPIC_API_KEY="your-key-here"

# Interactive mode
amplifier

# Single command
amplifier run "Your prompt here"

# With profile
amplifier run --profile dev "Your prompt"
\`\`\`

## Programmatic Usage

\`\`\`python
from amplifier_core import AmplifierSession

config = {
    "session": {
        "orchestrator": "loop-basic",
        "context": "context-simple"
    },
    "providers": [{"module": "provider-anthropic"}],
    "tools": [{"module": "tool-filesystem"}, {"module": "tool-bash"}],
    "hooks": [{"module": "hooks-logging"}]
}

async with AmplifierSession(config) as session:
    response = await session.execute("Your prompt here")
\`\`\`

## Architecture

Amplifier uses a three-layer architecture:

### Layer 1: Kernel (amplifier-core)
The stable runtime providing mechanisms:
- AmplifierSession - Main entry point
- Coordinator - Infrastructure context for modules
- Hook Registry - Event system (30+ events)
- Protocol Contracts - Structural typing interfaces
- Module Discovery - Python entry points

### Layer 2: Helpers (amplifier-helpers)
Convenience utilities:
- @tool, @hook decorators
- MockCoordinator for testing
- Protocol validators

### Layer 3: Developer Experience (amplifier-app-cli)
CLI and tooling:
- amplifier run/dev commands
- Scaffold templates
- Event inspector
- Profile management

## Module Types

Amplifier has 5 module types, all using Python Protocols (structural typing):

### Provider (LLM Backend)
\`\`\`python
class Provider:
    @property
    def name(self) -> str: ...
    def get_info(self) -> ProviderInfo: ...
    def list_models(self) -> list[ModelInfo]: ...
    async def complete(self, request: ChatRequest) -> ChatResponse: ...
    def parse_tool_calls(self, response: ChatResponse) -> list: ...
\`\`\`

### Tool (Agent Capability)
\`\`\`python
class Tool:
    @property
    def name(self) -> str: ...
    @property
    def description(self) -> str: ...
    async def execute(self, input: dict) -> ToolResult: ...
\`\`\`

### Orchestrator (Execution Loop)
\`\`\`python
class Orchestrator:
    async def execute(self, prompt, context, providers, tools, hooks) -> str: ...
\`\`\`

### ContextManager (Memory)
\`\`\`python
class ContextManager:
    def add_message(self, message): ...
    def get_messages(self) -> list: ...
    def should_compact(self) -> bool: ...
    def compact(self): ...
    def clear(self): ...
\`\`\`

### Hook (Observability)
\`\`\`python
async def hook_handler(event: str, data: dict) -> HookResult: ...
\`\`\`

## Creating a Custom Tool

\`\`\`python
from amplifier_core.models import ToolResult

class MyTool:
    @property
    def name(self) -> str:
        return "my_tool"
    
    @property
    def description(self) -> str:
        return "Description shown to LLM"
    
    async def execute(self, input: dict) -> ToolResult:
        result = process(input)
        return ToolResult(output=result, error=None)

async def mount(coordinator, config):
    await coordinator.mount("tools", MyTool(), name="my_tool")
    return lambda: None  # cleanup function
\`\`\`

Register in pyproject.toml:
\`\`\`toml
[project.entry-points."amplifier.modules"]
my-tool = "my_package.module:mount"
\`\`\`

## Hook System

### Event Categories
- **Session**: session:start, session:end, session:fork, session:resume
- **Prompt**: prompt:submit, prompt:complete
- **Provider**: provider:request, provider:response, provider:error
- **Streaming**: content_block:start, content_block:delta, content_block:end
- **Tool**: tool:pre, tool:post, tool:error
- **Context**: context:pre_compact, context:post_compact, context:include
- **Thinking**: thinking:delta, thinking:final
- **Governance**: approval:required, approval:granted, approval:denied, policy:violation

### HookResult Actions
- \`continue\` - Proceed normally (default)
- \`deny\` - Block operation with reason
- \`modify\` - Alter event data
- \`inject_context\` - Add message to agent context
- \`ask_user\` - Pause for user approval

### Hook Example
\`\`\`python
from amplifier_core.models import HookResult

async def security_hook(event: str, data: dict) -> HookResult:
    if event == "tool:pre" and data["tool_name"] == "bash":
        if "rm -rf" in str(data.get("tool_input", {})):
            return HookResult(action="deny", reason="Blocked")
    return HookResult(action="continue")
\`\`\`

## CLI Commands

| Command | Description |
|---------|-------------|
| \`amplifier\` | Interactive chat |
| \`amplifier run "<prompt>"\` | Execute single prompt |
| \`amplifier run --profile <n>\` | Use specific profile |
| \`amplifier profile list\` | List profiles |
| \`amplifier module list\` | List installed modules |
| \`amplifier session resume <id>\` | Resume session |

## Design Philosophy

**The Litmus Test**: "Could two teams want different behavior?"
- If yes → Module (policy)
- If no → Kernel (mechanism)

**Principles**:
1. Mechanism over policy
2. Backward compatible (additive only)
3. Minimal dependencies (pydantic, tomli, pyyaml)
4. Observable by default (30+ events)

## Contributing

### What Belongs in Core
- Protocol contracts
- AmplifierSession, Coordinator
- HookResult model
- MockCoordinator for testing
- Protocol validation utilities

### What Belongs Outside Core
- @tool/@hook decorators → amplifier-helpers
- CLI commands → amplifier-app-cli
- Hot reload, scaffolding → amplifier-app-cli
- Profile management → amplifier-profiles

### Priority Tasks
1. **High**: MockCoordinator in core, @tool decorator in helpers
2. **High**: \`amplifier dev\` hot reload in CLI
3. **Medium**: Event inspector, scaffold commands
4. **Medium**: Protocol conformance checker

## Links

- GitHub: https://github.com/microsoft/amplifier-core
- Full Amplifier: https://github.com/microsoft/amplifier
- Issues: https://github.com/microsoft/amplifier-core/issues

---
*Generated from Amplifier DX Documentation*
`;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard?.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setExportMenuOpen(false);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([generateMarkdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'amplifier.md';
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  // ============================================================================
  // FULL GUIDE EXPORT - Complete documentation for humans
  // ============================================================================
  const generateFullGuideMarkdown = () => {
    return `# Amplifier: Complete Developer Guide

> The ultra-thin kernel for modular AI agents

Amplifier is an open-source AI agent orchestration system from Microsoft built on Linux-kernel philosophy: a tiny, stable center (~2,600 lines) that provides mechanisms, while policies live as swappable modules at the edges.

---

## Table of Contents

1. [Overview](#overview)
2. [Quickstart](#quickstart)
   - [Using Profiles](#using-profiles)
   - [Writing a Custom Tool](#writing-a-custom-tool)
   - [Embedding in Your App](#embedding-in-your-app)
3. [Architecture](#architecture)
4. [API Reference](#api-reference)
   - [Protocol Contracts](#protocol-contracts)
   - [Hooks API](#hooks-api)
   - [Events](#events)
5. [CLI Reference](#cli-reference)
6. [Examples](#examples)
7. [Contributors Guide](#contributors-guide)

---

## Overview

### Quick Reference

- **Repository**: https://github.com/microsoft/amplifier-core
- **License**: MIT
- **Core Size**: ~2,600 lines
- **Design Philosophy**: Mechanism over policy

### Three Ways to Use Amplifier

1. **Use it** - Run AI agents with pre-built providers and tools. Configure via profiles.
2. **Extend it** - Write custom tools in 2 minutes. Duck typing, no inheritance.
3. **Embed it** - Drop the kernel into your app. Full programmatic control.

---

## Quickstart

### Using Profiles

Run AI agents using pre-built modules and profiles.

#### 1. Install

\`\`\`bash
pip install amplifier-core amplifier-app-cli
\`\`\`

#### 2. Set your API key

\`\`\`bash
export ANTHROPIC_API_KEY="your-key-here"
# Or: export OPENAI_API_KEY="your-key-here"
\`\`\`

#### 3. Run

\`\`\`bash
# Interactive
amplifier

# Single command
amplifier run "Explain this codebase"

# With profile
amplifier run --profile dev "Review for security issues"
\`\`\`

#### 4. Customize your profile

\`\`\`yaml
# ~/.amplifier/profiles/my-profile.yaml
name: my-profile
session:
  orchestrator: loop-streaming
  context: context-persistent
providers:
  - module: provider-anthropic
    config:
      model: claude-sonnet-4-20250514
tools:
  - module: tool-filesystem
  - module: tool-bash
\`\`\`

---

### Writing a Custom Tool

Write a custom tool in under 2 minutes using duck typing.

#### 1. Implement the Tool protocol

\`\`\`python
from amplifier_core.models import ToolResult

class WeatherTool:
    @property
    def name(self) -> str:
        return "weather"

    @property
    def description(self) -> str:
        return "Get current weather for a city"

    async def execute(self, input: dict) -> ToolResult:
        city = input.get("city", "Unknown")
        # Your logic here
        return ToolResult(output=f"Weather in {city}: 72°F, Sunny", error=None)
\`\`\`

#### 2. Add mount function

\`\`\`python
async def mount(coordinator, config):
    await coordinator.mount("tools", WeatherTool(), name="weather")
    return lambda: None  # cleanup
\`\`\`

#### 3. Register entry point

\`\`\`toml
# pyproject.toml
[project.entry-points."amplifier.modules"]
weather-tool = "my_package.weather:mount"
\`\`\`

#### 4. Install and use

\`\`\`bash
pip install -e .
amplifier run "What's the weather in Seattle?"
\`\`\`

#### Tool Protocol Summary

| Property/Method | Signature |
|----------------|-----------|
| \`name\` | property → str |
| \`description\` | property → str |
| \`execute(input)\` | async → ToolResult |

---

### Embedding in Your App

Embed Amplifier in your application with full programmatic control.

#### 1. Define mount plan

\`\`\`python
from amplifier_core import AmplifierSession

async def run_agent(prompt: str) -> str:
    config = {
        "session": {
            "orchestrator": "loop-basic",
            "context": "context-simple"
        },
        "providers": [{"module": "provider-anthropic"}],
        "tools": [{"module": "tool-filesystem"}, {"module": "tool-bash"}],
        "hooks": [{"module": "hooks-logging"}]
    }

    async with AmplifierSession(config) as session:
        return await session.execute(prompt)
\`\`\`

#### 2. Add custom hooks

\`\`\`python
from amplifier_core.models import HookResult

async def audit_hook(event: str, data: dict) -> HookResult:
    if event == "tool:pre":
        print(f"Executing: {data['tool_name']}")
    return HookResult(action="continue")

config["hooks"].append({"handler": audit_hook, "events": ["tool:*"]})
\`\`\`

#### 3. Fork sessions for parallel work

\`\`\`python
async with AmplifierSession(config) as parent:
    child1 = await parent.fork()
    child2 = await parent.fork()

    results = await asyncio.gather(
        child1.execute("Analyze backend"),
        child2.execute("Review frontend")
    )
\`\`\`

---

## Architecture

**Design philosophy: kernel, not framework. Mechanism over policy.**

### Three-Layer Architecture

\`\`\`
┌─────────────────────────────────────────┐
│  DX Layer (amplifier-app-cli)           │
│  CLI, scaffolding, dev mode, inspector  │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Helpers (amplifier-helpers)            │
│  @tool decorator, MockCoordinator, etc  │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Kernel (amplifier-core)                │
│  AmplifierSession, Coordinator, Events  │
└─────────────────────────────────────────┘
\`\`\`

### Core Concepts

#### Coordinator

Infrastructure context injected into all modules.

- \`session_id\` — Unique identifier
- \`config\` — Session configuration
- \`mount()\` — Register module
- \`emit()\` — Fire events

#### Mount Plan

Configuration specifying which modules to load.

\`\`\`json
{
  "session": {"orchestrator": "loop-basic"},
  "providers": [{"module": "provider-anthropic"}],
  "tools": [{"module": "tool-filesystem"}]
}
\`\`\`

#### Session Lifecycle

1. Load modules from mount plan
2. Call \`mount()\` on each
3. Execute prompts via orchestrator
4. Cleanup on session end

#### Event System

30+ hookable events covering the agent lifecycle:

- \`session:*\` - Session lifecycle events
- \`provider:*\` - LLM provider events
- \`tool:*\` - Tool execution events
- \`context:*\` - Context management events

### The Litmus Test

**"Could two teams want different behavior?"**

- **Yes → Module** (policy)
- **No → Kernel** (mechanism)

---

## API Reference

### Protocol Contracts

All modules use Python Protocols (structural typing). No inheritance required.

#### Provider (LLM Backend)

\`\`\`python
class Provider:
    @property
    def name(self) -> str: ...
    def get_info(self) -> ProviderInfo: ...
    def list_models(self) -> list[ModelInfo]: ...
    async def complete(self, request: ChatRequest) -> ChatResponse: ...
    def parse_tool_calls(self, response: ChatResponse) -> list: ...
\`\`\`

#### Tool (Agent Capability)

\`\`\`python
class Tool:
    @property
    def name(self) -> str: ...
    @property
    def description(self) -> str: ...
    async def execute(self, input: dict) -> ToolResult: ...
\`\`\`

#### Orchestrator (Execution Loop)

\`\`\`python
class Orchestrator:
    async def execute(self, prompt, context, providers, tools, hooks) -> str: ...
\`\`\`

#### ContextManager (Memory)

\`\`\`python
class ContextManager:
    def add_message(self, message): ...
    def get_messages(self) -> list: ...
    def should_compact(self) -> bool: ...
    def compact(self): ...
    def clear(self): ...
\`\`\`

#### Hook (Observability)

\`\`\`python
async def hook_handler(event: str, data: dict) -> HookResult: ...
\`\`\`

---

### Hooks API

Hooks observe events and optionally modify behavior via HookResult.

\`\`\`python
async def my_hook(event: str, data: dict) -> HookResult:
    if event == "tool:pre" and "rm -rf" in str(data.get("tool_input")):
        return HookResult(action="deny", reason="Blocked")
    return HookResult(action="continue")
\`\`\`

#### HookResult Actions

| Action | Description |
|--------|-------------|
| \`continue\` | Proceed normally (default) |
| \`deny\` | Block with reason |
| \`modify\` | Alter event data |
| \`inject_context\` | Add message to context |
| \`ask_user\` | Pause for approval |

---

### Events

30+ hookable events covering the entire agent lifecycle.

#### Session Events
- \`session:start\` - Session initialized
- \`session:end\` - Session terminated
- \`session:fork\` - Session forked

#### Provider Events
- \`provider:request\` - LLM request sent
- \`provider:response\` - LLM response received
- \`provider:error\` - Provider error occurred

#### Tool Events
- \`tool:pre\` - Before tool execution
- \`tool:post\` - After tool execution
- \`tool:error\` - Tool error occurred

#### Streaming Events
- \`content_block:start\` - Stream block started
- \`content_block:delta\` - Stream chunk received
- \`content_block:end\` - Stream block ended

#### Context Events
- \`context:pre_compact\` - Before context compaction
- \`context:post_compact\` - After context compaction

#### Governance Events
- \`approval:required\` - Approval needed
- \`approval:granted\` - Approval given
- \`approval:denied\` - Approval denied
- \`policy:violation\` - Policy violated

---

## CLI Reference

### Running

| Command | Description |
|---------|-------------|
| \`amplifier\` | Interactive chat |
| \`amplifier run "prompt"\` | Single command |
| \`amplifier run --profile name\` | With profile |
| \`amplifier run -m model\` | Override model |

### Profiles

| Command | Description |
|---------|-------------|
| \`amplifier profile list\` | List profiles |
| \`amplifier profile show name\` | Show details |
| \`amplifier profile set name\` | Set default |

### Modules

| Command | Description |
|---------|-------------|
| \`amplifier module list\` | List installed |
| \`amplifier module show name\` | Show details |

### Collections

| Command | Description |
|---------|-------------|
| \`amplifier collection add url\` | Add from Git |
| \`amplifier collection list\` | List installed |

### Tips

- Pipe input: \`cat file.py | amplifier run "Explain"\`
- Set default profile: \`AMPLIFIER_PROFILE=dev\`
- Verbose output: \`-v\` or \`--verbose\`

---

## Examples

### Approval Gate

Require user approval for sensitive operations.

\`\`\`python
async def approval_gate(event, data) -> HookResult:
    if event == "tool:pre" and data["tool_name"] == "bash":
        return HookResult(
            action="ask_user",
            approval_prompt=f"Allow bash: {data['tool_input']}?",
            approval_options=["Allow", "Deny"]
        )
    return HookResult(action="continue")
\`\`\`

### Token Tracker

Monitor token usage across providers.

\`\`\`python
async def track(event, data) -> HookResult:
    if event == "provider:response":
        tokens = data.get("usage", {}).get("total_tokens", 0)
        print(f"Used {tokens} tokens")
    return HookResult(action="continue")
\`\`\`

### PII Redaction

Automatically redact sensitive information.

\`\`\`python
import re
PATTERNS = {"email": r'[\\w.-]+@[\\w.-]+', "ssn": r'\\d{3}-\\d{2}-\\d{4}'}

async def redact(event, data) -> HookResult:
    if event == "content_block:delta":
        content = data.get("delta", "")
        for name, pattern in PATTERNS.items():
            content = re.sub(pattern, "[REDACTED]", content)
        return HookResult(action="modify", data={"delta": content})
    return HookResult(action="continue")
\`\`\`

### Multi-Provider Fallback

\`\`\`yaml
# profile.yaml
providers:
  - module: provider-anthropic
    priority: 1  # Primary
  - module: provider-openai
    priority: 2  # Fallback
  - module: provider-ollama
    priority: 3  # Local
\`\`\`

---

## Contributors Guide

### North Star

> Amplifier makes advanced AI agent systems *feel like scripting*. Developers should go from an idea to a working extension in under 2 minutes.

### The Gap

The kernel is already built. It's stable, minimal, and powerful. What's missing is the **developer experience layer**—the tooling that makes the kernel approachable.

### What Belongs Where

| Feature | Layer | Status |
|---------|-------|--------|
| Protocol contracts | Kernel (core) | ✓ Done |
| AmplifierSession | Kernel (core) | ✓ Done |
| Event system (30+ events) | Kernel (core) | ✓ Done |
| MockCoordinator for testing | Kernel (core) | Needed |
| Protocol validation utility | Kernel (core) | Needed |
| @tool / @hook decorators | Helpers | Needed |
| Test harness utilities | Helpers | Needed |
| \`amplifier dev\` (hot reload) | CLI | Needed |
| \`amplifier inspect --events\` | CLI | Needed |
| \`amplifier scaffold\` | CLI | Needed |
| \`amplifier check\` (validation) | CLI | Needed |
| \`amplifier plan show\` | CLI | Needed |

### Developer Personas

1. **Consumer** - Uses existing modules. Cares about profiles, CLI, and configuration.
2. **Extender** - Adds custom tools/hooks. Needs minimal boilerplate and fast feedback.
3. **Architect** - Embeds Amplifier in products. Needs integration patterns and observability.

### Priority Tasks

#### High Priority

**MockCoordinator for Testing** (amplifier-core)

Enable unit testing modules without booting a full session.

\`\`\`python
# amplifier_core/testing.py
class MockCoordinator:
    def __init__(self):
        self.mounted = {}
        self.events = []

    async def mount(self, category, instance, name):
        self.mounted.setdefault(category, {})[name] = instance

    async def emit(self, event, data):
        self.events.append((event, data))

# Usage in tests
async def test_my_tool():
    coord = MockCoordinator()
    await mount(coord, {})

    tool = coord.mounted["tools"]["my_tool"]
    result = await tool.execute({"input": "test"})
    assert result.error is None
\`\`\`

**@tool Decorator** (amplifier-helpers)

2-minute time-to-first-tool. Reduces boilerplate dramatically.

\`\`\`python
# amplifier_helpers/decorators.py
def tool(name: str, description: str):
    def decorator(func):
        class GeneratedTool:
            @property
            def name(self): return name
            @property
            def description(self): return description
            async def execute(self, input: dict):
                return await func(**input)
        return GeneratedTool()
    return decorator

# Usage
from amplifier_helpers import tool

@tool(name="greet", description="Says hello")
async def greet(name: str) -> str:
    return f"Hello, {name}!"
\`\`\`

**amplifier dev (Hot Reload)** (amplifier-app-cli)

Edit → Save → Test feedback loop for module development.

\`\`\`bash
$ amplifier dev my_tool.py

# Watches file, auto-reloads on save
# Provides interactive testing environment
# Shows events in real-time
\`\`\`

#### Medium Priority

**Event Inspector** (amplifier-app-cli)

\`\`\`bash
$ amplifier inspect --events

# Output:
# 14:32:01.234 session:start     {session_id: "abc123"}
# 14:32:01.567 prompt:submit     {content: "Hello"}
# 14:32:02.123 provider:request  {provider: "anthropic", messages: 1}
\`\`\`

**Scaffold Templates** (amplifier-app-cli)

\`\`\`bash
$ amplifier scaffold tool my_tool
# Creates: my_tool/, __init__.py, my_tool.py, pyproject.toml, tests/

$ amplifier scaffold hook --pattern approval
# Generates approval gate hook template
\`\`\`

**Protocol Conformance Check** (amplifier-app-cli + core)

\`\`\`bash
$ amplifier check my_tool.py

✓ Tool protocol satisfied
  ✓ name property returns str
  ✓ description property returns str
  ✓ execute() is async and returns ToolResult
\`\`\`

### Directory Structure

\`\`\`
amplifier-ecosystem/
├── amplifier-core/           # Kernel (this repo)
│   ├── amplifier_core/
│   │   ├── session.py        # AmplifierSession
│   │   ├── coordinator.py    # Coordinator
│   │   ├── hooks.py          # HookRegistry
│   │   ├── protocols.py      # Protocol definitions
│   │   ├── models.py         # ToolResult, HookResult, etc.
│   │   ├── testing.py        # MockCoordinator (NEW)
│   │   └── validation.py     # check_protocol() (NEW)
│   └── pyproject.toml
│
├── amplifier-helpers/        # Convenience utilities (NEW)
│   ├── amplifier_helpers/
│   │   ├── decorators.py     # @tool, @hook
│   │   └── testing.py        # ToolTestHarness
│   └── pyproject.toml
│
├── amplifier-app-cli/        # CLI application
│   ├── amplifier_cli/
│   │   ├── commands/
│   │   │   ├── run.py
│   │   │   ├── dev.py        # Hot reload (NEW)
│   │   │   ├── inspect.py    # Event inspector (NEW)
│   │   │   ├── scaffold.py   # Templates (NEW)
│   │   │   ├── check.py      # Validation (NEW)
│   │   │   └── plan.py       # Visualizer (NEW)
│   │   └── main.py
│   └── pyproject.toml
│
└── amplifier-profiles/       # Profile management
    └── ...
\`\`\`

---

## Links

- **GitHub**: https://github.com/microsoft/amplifier-core
- **Full Amplifier**: https://github.com/microsoft/amplifier
- **Issues**: https://github.com/microsoft/amplifier-core/issues

---

*Generated from Amplifier DX Documentation - Complete Guide*
`;
  };

  const handleDownloadFullGuide = () => {
    const blob = new Blob([generateFullGuideMarkdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'amplifier-fullguide.md';
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  // Components
  const CodeBlock = ({ code, language = 'python', id, title }) => (
    <div className="code-block">
      {title && <div className="code-title">{title}</div>}
      <div className="code-header">
        <span className="code-lang">{language}</span>
        <button onClick={() => copyCode(code, id)} className="copy-btn">
          {copiedCode === id ? '✓' : 'Copy'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );

  const Tabs = ({ tabs, active, onChange }) => (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  // ============================================================================
  // HOME SECTION
  // ============================================================================
  const HomeSection = () => (
    <section className="section">
      <div className="hero">
        <div className="hero-eyebrow">Open Source · Microsoft · MIT License</div>
        <h1 className="hero-title">Amplifier</h1>
        <p className="hero-subtitle">The ultra-thin kernel for modular AI agents</p>
        <p className="hero-description">
          Build AI agent systems with Linux-kernel philosophy: a tiny, stable center (~2,600 lines) 
          that provides mechanisms, while policies live as swappable modules at the edges.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => setActiveSection('quickstart')}>
            Get started
          </button>
          <a href="https://github.com/microsoft/amplifier-core" className="btn-secondary" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </div>
      </div>

      <div className="feature-cards">
        <div className="feature-card" style={{'--accent': 'var(--blue)'}}>
          <div className="feature-gradient"></div>
          <span className="feature-label">Use it</span>
          <p>Run AI agents with pre-built providers and tools. Configure via profiles.</p>
        </div>
        <div className="feature-card" style={{'--accent': 'var(--purple)'}}>
          <div className="feature-gradient"></div>
          <span className="feature-label">Extend it</span>
          <p>Write custom tools in 2 minutes. Duck typing, no inheritance.</p>
        </div>
        <div className="feature-card" style={{'--accent': 'var(--green)'}}>
          <div className="feature-gradient"></div>
          <span className="feature-label">Embed it</span>
          <p>Drop the kernel into your app. Full programmatic control.</p>
        </div>
      </div>

      <div className="quickstart-preview">
        <h2>Developer quickstart</h2>
        <p className="section-desc">Make your first agent request in minutes.</p>
        <CodeBlock code={`# Install
pip install amplifier-core amplifier-app-cli

# Set your API key
export ANTHROPIC_API_KEY="your-key-here"

# Run
amplifier run "List all Python files in this directory"`} language="bash" id="home-quick" />
      </div>

      <div className="start-building">
        <h2>Start building</h2>
        <div className="start-grid">
          <button className="start-item" onClick={() => { setActiveSection('quickstart'); setActiveTab('consumer'); }}>
            <div className="start-icon">▶</div>
            <div>
              <strong>Use existing modules</strong>
              <span>Configure profiles and run agents</span>
            </div>
          </button>
          <button className="start-item" onClick={() => { setActiveSection('quickstart'); setActiveTab('extender'); }}>
            <div className="start-icon">+</div>
            <div>
              <strong>Write a custom tool</strong>
              <span>Extend agent capabilities</span>
            </div>
          </button>
          <button className="start-item" onClick={() => { setActiveSection('quickstart'); setActiveTab('architect'); }}>
            <div className="start-icon">{ }</div>
            <div>
              <strong>Embed in your app</strong>
              <span>Programmatic session control</span>
            </div>
          </button>
          <button className="start-item" onClick={() => setActiveSection('reference')}>
            <div className="start-icon">◈</div>
            <div>
              <strong>Hooks &amp; events</strong>
              <span>Observe and control execution</span>
            </div>
          </button>
        </div>
      </div>
    </section>
  );

  // ============================================================================
  // QUICKSTART SECTION
  // ============================================================================
  const QuickstartSection = () => {
    const tabs = [
      { id: 'consumer', label: 'Use a profile' },
      { id: 'extender', label: 'Write a tool' },
      { id: 'architect', label: 'Embed in app' },
    ];

    return (
      <section className="section">
        <h1>Quickstart</h1>
        <p className="section-desc">Choose your path. Each guide gets you productive in minutes.</p>

        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === 'consumer' && (
          <div className="panel">
            <p>Run AI agents using pre-built modules and profiles.</p>
            
            <h3>1. Install</h3>
            <CodeBlock code={`pip install amplifier-core amplifier-app-cli`} language="bash" id="c1" />

            <h3>2. Set your API key</h3>
            <CodeBlock code={`export ANTHROPIC_API_KEY="your-key-here"
# Or: export OPENAI_API_KEY="your-key-here"`} language="bash" id="c2" />

            <h3>3. Run</h3>
            <CodeBlock code={`# Interactive
amplifier

# Single command
amplifier run "Explain this codebase"

# With profile
amplifier run --profile dev "Review for security issues"`} language="bash" id="c3" />

            <h3>4. Customize your profile</h3>
            <CodeBlock code={`# ~/.amplifier/profiles/my-profile.yaml
name: my-profile
session:
  orchestrator: loop-streaming
  context: context-persistent
providers:
  - module: provider-anthropic
    config:
      model: claude-sonnet-4-20250514
tools:
  - module: tool-filesystem
  - module: tool-bash`} language="yaml" id="c4" />
          </div>
        )}

        {activeTab === 'extender' && (
          <div className="panel">
            <p>Write a custom tool in under 2 minutes using duck typing.</p>
            
            <h3>1. Implement the Tool protocol</h3>
            <CodeBlock code={`from amplifier_core.models import ToolResult

class WeatherTool:
    @property
    def name(self) -> str:
        return "weather"
    
    @property
    def description(self) -> str:
        return "Get current weather for a city"
    
    async def execute(self, input: dict) -> ToolResult:
        city = input.get("city", "Unknown")
        # Your logic here
        return ToolResult(output=f"Weather in {city}: 72°F, Sunny", error=None)`} language="python" id="e1" />

            <h3>2. Add mount function</h3>
            <CodeBlock code={`async def mount(coordinator, config):
    await coordinator.mount("tools", WeatherTool(), name="weather")
    return lambda: None  # cleanup`} language="python" id="e2" />

            <h3>3. Register entry point</h3>
            <CodeBlock code={`# pyproject.toml
[project.entry-points."amplifier.modules"]
weather-tool = "my_package.weather:mount"`} language="toml" id="e3" />

            <h3>4. Install and use</h3>
            <CodeBlock code={`pip install -e .
amplifier run "What's the weather in Seattle?"`} language="bash" id="e4" />

            <div className="info-box">
              <strong>Tool Protocol</strong>
              <table className="mini-table">
                <tbody>
                  <tr><td><code>name</code></td><td>property → str</td></tr>
                  <tr><td><code>description</code></td><td>property → str</td></tr>
                  <tr><td><code>execute(input)</code></td><td>async → ToolResult</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'architect' && (
          <div className="panel">
            <p>Embed Amplifier in your application with full programmatic control.</p>
            
            <h3>1. Define mount plan</h3>
            <CodeBlock code={`from amplifier_core import AmplifierSession

async def run_agent(prompt: str) -> str:
    config = {
        "session": {
            "orchestrator": "loop-basic",
            "context": "context-simple"
        },
        "providers": [{"module": "provider-anthropic"}],
        "tools": [{"module": "tool-filesystem"}, {"module": "tool-bash"}],
        "hooks": [{"module": "hooks-logging"}]
    }
    
    async with AmplifierSession(config) as session:
        return await session.execute(prompt)`} language="python" id="a1" />

            <h3>2. Add custom hooks</h3>
            <CodeBlock code={`from amplifier_core.models import HookResult

async def audit_hook(event: str, data: dict) -> HookResult:
    if event == "tool:pre":
        print(f"Executing: {data['tool_name']}")
    return HookResult(action="continue")

config["hooks"].append({"handler": audit_hook, "events": ["tool:*"]})`} language="python" id="a2" />

            <h3>3. Fork sessions for parallel work</h3>
            <CodeBlock code={`async with AmplifierSession(config) as parent:
    child1 = await parent.fork()
    child2 = await parent.fork()
    
    results = await asyncio.gather(
        child1.execute("Analyze backend"),
        child2.execute("Review frontend")
    )`} language="python" id="a3" />
          </div>
        )}
      </section>
    );
  };

  // ============================================================================
  // ARCHITECTURE SECTION
  // ============================================================================
  const ArchitectureSection = () => (
    <section className="section">
      <h1>Architecture</h1>
      <p className="section-desc">Design philosophy: kernel, not framework. Mechanism over policy.</p>

      <div className="arch-layers">
        <div className="arch-layer" style={{'--layer-color': 'var(--blue)'}}>
          <div className="layer-header">
            <span className="layer-badge">DX Layer</span>
            <span className="layer-pkg">amplifier-app-cli</span>
          </div>
          <p>CLI, scaffolding, dev mode, event inspector</p>
        </div>
        <div className="arch-connector">↓</div>
        <div className="arch-layer" style={{'--layer-color': 'var(--purple)'}}>
          <div className="layer-header">
            <span className="layer-badge">Helpers</span>
            <span className="layer-pkg">amplifier-helpers</span>
          </div>
          <p>@tool decorator, MockCoordinator, test utilities</p>
        </div>
        <div className="arch-connector">↓</div>
        <div className="arch-layer" style={{'--layer-color': 'var(--green)'}}>
          <div className="layer-header">
            <span className="layer-badge">Kernel</span>
            <span className="layer-pkg">amplifier-core</span>
          </div>
          <p>AmplifierSession, Coordinator, Protocols, Events</p>
        </div>
      </div>

      <h2>Core concepts</h2>
      <div className="concepts">
        <div className="concept">
          <h3>Coordinator</h3>
          <p>Infrastructure context injected into all modules.</p>
          <ul>
            <li><code>session_id</code> — Unique identifier</li>
            <li><code>config</code> — Session configuration</li>
            <li><code>mount()</code> — Register module</li>
            <li><code>emit()</code> — Fire events</li>
          </ul>
        </div>
        <div className="concept">
          <h3>Mount Plan</h3>
          <p>Configuration specifying which modules to load.</p>
          <CodeBlock code={`{
  "session": {"orchestrator": "loop-basic"},
  "providers": [{"module": "provider-anthropic"}],
  "tools": [{"module": "tool-filesystem"}]
}`} language="json" id="mp" />
        </div>
        <div className="concept">
          <h3>Session Lifecycle</h3>
          <ol>
            <li>Load modules from mount plan</li>
            <li>Call <code>mount()</code> on each</li>
            <li>Execute prompts via orchestrator</li>
            <li>Cleanup on session end</li>
          </ol>
        </div>
        <div className="concept">
          <h3>Event System</h3>
          <p>30+ hookable events covering the agent lifecycle.</p>
          <div className="event-tags">
            <span>session:*</span>
            <span>provider:*</span>
            <span>tool:*</span>
            <span>context:*</span>
          </div>
        </div>
      </div>

      <div className="litmus">
        <h3>The Litmus Test</h3>
        <p>"Could two teams want different behavior?"</p>
        <p><strong>Yes → Module</strong> &nbsp;|&nbsp; <strong>No → Kernel</strong></p>
      </div>
    </section>
  );

  // ============================================================================
  // REFERENCE SECTION
  // ============================================================================
  const ReferenceSection = () => {
    const tabs = [
      { id: 'contracts', label: 'Contracts' },
      { id: 'hooks', label: 'Hooks API' },
      { id: 'events', label: 'Events' },
    ];

    return (
      <section className="section">
        <h1>API Reference</h1>
        <p className="section-desc">Complete documentation for module developers.</p>

        <Tabs tabs={tabs} active={refTab} onChange={setRefTab} />

        {refTab === 'contracts' && (
          <div className="panel">
            <p>All modules use Python Protocols (structural typing). No inheritance required.</p>
            
            <div className="contracts">
              <div className="contract">
                <h4>Provider <span>LLM Backend</span></h4>
                <code>name: str</code>
                <code>get_info() → ProviderInfo</code>
                <code>list_models() → list[ModelInfo]</code>
                <code>complete(ChatRequest) → ChatResponse</code>
                <code>parse_tool_calls(ChatResponse) → list</code>
              </div>
              <div className="contract">
                <h4>Tool <span>Agent Capability</span></h4>
                <code>name: str</code>
                <code>description: str</code>
                <code>execute(input: dict) → ToolResult</code>
              </div>
              <div className="contract">
                <h4>Orchestrator <span>Execution Loop</span></h4>
                <code>execute(prompt, context, providers, tools, hooks) → str</code>
              </div>
              <div className="contract">
                <h4>ContextManager <span>Memory</span></h4>
                <code>add_message(message)</code>
                <code>get_messages() → list</code>
                <code>should_compact() → bool</code>
                <code>compact()</code>
                <code>clear()</code>
              </div>
              <div className="contract">
                <h4>Hook <span>Observability</span></h4>
                <code>async handler(event: str, data: dict) → HookResult</code>
              </div>
            </div>
          </div>
        )}

        {refTab === 'hooks' && (
          <div className="panel">
            <p>Hooks observe events and optionally modify behavior via HookResult.</p>
            
            <CodeBlock code={`async def my_hook(event: str, data: dict) -> HookResult:
    if event == "tool:pre" and "rm -rf" in str(data.get("tool_input")):
        return HookResult(action="deny", reason="Blocked")
    return HookResult(action="continue")`} language="python" id="hook" />

            <h3>HookResult Actions</h3>
            <div className="actions">
              <div className="action">
                <code>continue</code>
                <span>Proceed normally (default)</span>
              </div>
              <div className="action">
                <code>deny</code>
                <span>Block with reason</span>
              </div>
              <div className="action">
                <code>modify</code>
                <span>Alter event data</span>
              </div>
              <div className="action">
                <code>inject_context</code>
                <span>Add message to context</span>
              </div>
              <div className="action">
                <code>ask_user</code>
                <span>Pause for approval</span>
              </div>
            </div>
          </div>
        )}

        {refTab === 'events' && (
          <div className="panel">
            <p>30+ hookable events covering the entire agent lifecycle.</p>
            
            <div className="event-groups">
              <div className="event-group">
                <h4>Session</h4>
                <code>session:start</code>
                <code>session:end</code>
                <code>session:fork</code>
              </div>
              <div className="event-group">
                <h4>Provider</h4>
                <code>provider:request</code>
                <code>provider:response</code>
                <code>provider:error</code>
              </div>
              <div className="event-group">
                <h4>Tool</h4>
                <code>tool:pre</code>
                <code>tool:post</code>
                <code>tool:error</code>
              </div>
              <div className="event-group">
                <h4>Streaming</h4>
                <code>content_block:start</code>
                <code>content_block:delta</code>
                <code>content_block:end</code>
              </div>
              <div className="event-group">
                <h4>Context</h4>
                <code>context:pre_compact</code>
                <code>context:post_compact</code>
              </div>
              <div className="event-group">
                <h4>Governance</h4>
                <code>approval:required</code>
                <code>approval:granted</code>
                <code>policy:violation</code>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  };

  // ============================================================================
  // CLI SECTION
  // ============================================================================
  const CLISection = () => (
    <section className="section">
      <h1>CLI Reference</h1>
      <p className="section-desc">Command-line interface for running and managing Amplifier.</p>

      <div className="cli-groups">
        <div className="cli-group">
          <h3>Running</h3>
          <div className="cli-item"><code>amplifier</code><span>Interactive chat</span></div>
          <div className="cli-item"><code>amplifier run "prompt"</code><span>Single command</span></div>
          <div className="cli-item"><code>amplifier run --profile name</code><span>With profile</span></div>
          <div className="cli-item"><code>amplifier run -m model</code><span>Override model</span></div>
        </div>
        <div className="cli-group">
          <h3>Profiles</h3>
          <div className="cli-item"><code>amplifier profile list</code><span>List profiles</span></div>
          <div className="cli-item"><code>amplifier profile show name</code><span>Show details</span></div>
          <div className="cli-item"><code>amplifier profile set name</code><span>Set default</span></div>
        </div>
        <div className="cli-group">
          <h3>Modules</h3>
          <div className="cli-item"><code>amplifier module list</code><span>List installed</span></div>
          <div className="cli-item"><code>amplifier module show name</code><span>Show details</span></div>
        </div>
        <div className="cli-group">
          <h3>Collections</h3>
          <div className="cli-item"><code>amplifier collection add url</code><span>Add from Git</span></div>
          <div className="cli-item"><code>amplifier collection list</code><span>List installed</span></div>
        </div>
      </div>

      <div className="info-box">
        <strong>Tips</strong>
        <ul>
          <li>Pipe input: <code>cat file.py | amplifier run "Explain"</code></li>
          <li>Set default profile: <code>AMPLIFIER_PROFILE=dev</code></li>
          <li>Verbose output: <code>-v</code> or <code>--verbose</code></li>
        </ul>
      </div>
    </section>
  );

  // ============================================================================
  // EXAMPLES SECTION
  // ============================================================================
  const ExamplesSection = () => (
    <section className="section">
      <h1>Examples</h1>
      <p className="section-desc">Real-world patterns and use cases.</p>

      <div className="examples">
        <div className="example">
          <h3>Approval Gate</h3>
          <p>Require user approval for sensitive operations.</p>
          <CodeBlock code={`async def approval_gate(event, data) -> HookResult:
    if event == "tool:pre" and data["tool_name"] == "bash":
        return HookResult(
            action="ask_user",
            approval_prompt=f"Allow bash: {data['tool_input']}?",
            approval_options=["Allow", "Deny"]
        )
    return HookResult(action="continue")`} language="python" id="ex1" />
        </div>

        <div className="example">
          <h3>Token Tracker</h3>
          <p>Monitor token usage across providers.</p>
          <CodeBlock code={`async def track(event, data) -> HookResult:
    if event == "provider:response":
        tokens = data.get("usage", {}).get("total_tokens", 0)
        print(f"Used {tokens} tokens")
    return HookResult(action="continue")`} language="python" id="ex2" />
        </div>

        <div className="example">
          <h3>PII Redaction</h3>
          <p>Automatically redact sensitive information.</p>
          <CodeBlock code={`import re
PATTERNS = {"email": r'[\\w.-]+@[\\w.-]+', "ssn": r'\\d{3}-\\d{2}-\\d{4}'}

async def redact(event, data) -> HookResult:
    if event == "content_block:delta":
        content = data.get("delta", "")
        for name, pattern in PATTERNS.items():
            content = re.sub(pattern, "[REDACTED]", content)
        return HookResult(action="modify", data={"delta": content})
    return HookResult(action="continue")`} language="python" id="ex3" />
        </div>

        <div className="example">
          <h3>Multi-Provider Fallback</h3>
          <CodeBlock code={`# profile.yaml
providers:
  - module: provider-anthropic
    priority: 1  # Primary
  - module: provider-openai
    priority: 2  # Fallback
  - module: provider-ollama
    priority: 3  # Local`} language="yaml" id="ex4" />
        </div>
      </div>
    </section>
  );

  // ============================================================================
  // CONTRIBUTE SECTION - DX Roadmap
  // ============================================================================
  const ContributeSection = () => {
    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'tasks', label: 'Priority Tasks' },
      { id: 'specs', label: 'Specifications' },
    ];

    return (
      <section className="section">
        <h1>Contributors Guide</h1>
        <p className="section-desc">Help us build a world-class developer experience for Amplifier.</p>

        <Tabs tabs={tabs} active={contribTab} onChange={setContribTab} />

        {contribTab === 'overview' && (
          <div className="panel">
            <div className="callout">
              <p><strong>North Star:</strong> Amplifier makes advanced AI agent systems <em>feel like scripting</em>. Developers should go from an idea to a working extension in under 2 minutes.</p>
            </div>

            <h3>The Gap</h3>
            <p>The kernel is already built. It's stable, minimal, and powerful. What's missing is the <strong>developer experience layer</strong>—the tooling that makes the kernel approachable.</p>

            <h3>What Belongs Where</h3>
            <table className="contrib-table">
              <thead>
                <tr><th>Feature</th><th>Layer</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr><td>Protocol contracts</td><td>Kernel (core)</td><td className="done">✓ Done</td></tr>
                <tr><td>AmplifierSession</td><td>Kernel (core)</td><td className="done">✓ Done</td></tr>
                <tr><td>Event system (30+ events)</td><td>Kernel (core)</td><td className="done">✓ Done</td></tr>
                <tr><td>MockCoordinator for testing</td><td>Kernel (core)</td><td className="needed">Needed</td></tr>
                <tr><td>Protocol validation utility</td><td>Kernel (core)</td><td className="needed">Needed</td></tr>
                <tr><td>@tool / @hook decorators</td><td>Helpers</td><td className="needed">Needed</td></tr>
                <tr><td>Test harness utilities</td><td>Helpers</td><td className="needed">Needed</td></tr>
                <tr><td><code>amplifier dev</code> (hot reload)</td><td>CLI</td><td className="needed">Needed</td></tr>
                <tr><td><code>amplifier inspect --events</code></td><td>CLI</td><td className="needed">Needed</td></tr>
                <tr><td><code>amplifier scaffold</code></td><td>CLI</td><td className="needed">Needed</td></tr>
                <tr><td><code>amplifier check</code> (validation)</td><td>CLI</td><td className="needed">Needed</td></tr>
                <tr><td><code>amplifier plan show</code></td><td>CLI</td><td className="needed">Needed</td></tr>
              </tbody>
            </table>

            <h3>Developer Personas</h3>
            <div className="personas">
              <div className="persona">
                <strong>Consumer</strong>
                <p>Uses existing modules. Cares about profiles, CLI, and configuration.</p>
              </div>
              <div className="persona">
                <strong>Extender</strong>
                <p>Adds custom tools/hooks. Needs minimal boilerplate and fast feedback.</p>
              </div>
              <div className="persona">
                <strong>Architect</strong>
                <p>Embeds Amplifier in products. Needs integration patterns and observability.</p>
              </div>
            </div>
          </div>
        )}

        {contribTab === 'tasks' && (
          <div className="panel">
            <h3>🔴 High Priority</h3>
            
            <div className="task">
              <div className="task-header">
                <span className="task-title">MockCoordinator for Testing</span>
                <span className="task-layer">amplifier-core</span>
              </div>
              <p>Enable unit testing modules without booting a full session.</p>
              <CodeBlock code={`# amplifier_core/testing.py
class MockCoordinator:
    def __init__(self):
        self.mounted = {}
        self.events = []
    
    async def mount(self, category, instance, name):
        self.mounted.setdefault(category, {})[name] = instance
    
    async def emit(self, event, data):
        self.events.append((event, data))

# Usage in tests
async def test_my_tool():
    coord = MockCoordinator()
    await mount(coord, {})
    
    tool = coord.mounted["tools"]["my_tool"]
    result = await tool.execute({"input": "test"})
    assert result.error is None`} language="python" id="t1" />
            </div>

            <div className="task">
              <div className="task-header">
                <span className="task-title">@tool Decorator</span>
                <span className="task-layer">amplifier-helpers</span>
              </div>
              <p>2-minute time-to-first-tool. Reduces boilerplate dramatically.</p>
              <CodeBlock code={`# amplifier_helpers/decorators.py
def tool(name: str, description: str):
    def decorator(func):
        class GeneratedTool:
            @property
            def name(self): return name
            @property
            def description(self): return description
            async def execute(self, input: dict):
                return await func(**input)
        return GeneratedTool()
    return decorator

# Usage
from amplifier_helpers import tool

@tool(name="greet", description="Says hello")
async def greet(name: str) -> str:
    return f"Hello, {name}!"`} language="python" id="t2" />
            </div>

            <div className="task">
              <div className="task-header">
                <span className="task-title">amplifier dev (Hot Reload)</span>
                <span className="task-layer">amplifier-app-cli</span>
              </div>
              <p>Edit → Save → Test feedback loop for module development.</p>
              <CodeBlock code={`# CLI command
$ amplifier dev my_tool.py

# Watches file, auto-reloads on save
# Provides interactive testing environment
# Shows events in real-time

# Implementation uses watchdog + importlib.reload
# Spawns test session with --dev-mode flag`} language="bash" id="t3" />
            </div>

            <h3>🟡 Medium Priority</h3>

            <div className="task">
              <div className="task-header">
                <span className="task-title">Event Inspector</span>
                <span className="task-layer">amplifier-app-cli</span>
              </div>
              <p>Real-time visualization of the event stream.</p>
              <CodeBlock code={`$ amplifier inspect --events

# Output:
# 14:32:01.234 session:start     {session_id: "abc123"}
# 14:32:01.567 prompt:submit     {content: "Hello"}
# 14:32:02.123 provider:request  {provider: "anthropic", messages: 1}
# 14:32:03.456 provider:response {tokens: 42}
# 14:32:03.789 tool:pre          {tool: "filesystem", input: {...}}
# 14:32:04.012 tool:post         {tool: "filesystem", result: {...}}`} language="bash" id="t4" />
            </div>

            <div className="task">
              <div className="task-header">
                <span className="task-title">Scaffold Templates</span>
                <span className="task-layer">amplifier-app-cli</span>
              </div>
              <p>Generate module templates with correct structure.</p>
              <CodeBlock code={`$ amplifier scaffold tool my_tool
# Creates:
# my_tool/
#   __init__.py
#   my_tool.py      # Tool class + mount()
#   pyproject.toml  # Entry point configured
#   tests/
#     test_my_tool.py

$ amplifier scaffold hook --pattern approval
# Generates approval gate hook template

$ amplifier scaffold provider my_provider
# Generates provider with all 5 required methods`} language="bash" id="t5" />
            </div>

            <div className="task">
              <div className="task-header">
                <span className="task-title">Protocol Conformance Check</span>
                <span className="task-layer">amplifier-app-cli + core</span>
              </div>
              <p>Validate that a module correctly implements its protocol.</p>
              <CodeBlock code={`$ amplifier check my_tool.py

✓ Tool protocol satisfied
  ✓ name property returns str
  ✓ description property returns str
  ✓ execute() is async and returns ToolResult

# Or with errors:
✗ Tool protocol NOT satisfied
  ✗ Missing: description property
  ✗ execute() should be async`} language="bash" id="t6" />
            </div>

            <div className="task">
              <div className="task-header">
                <span className="task-title">Mount Plan Visualizer</span>
                <span className="task-layer">amplifier-app-cli</span>
              </div>
              <p>Show the resolved module graph for a profile.</p>
              <CodeBlock code={`$ amplifier plan show --profile dev

Profile: dev
├── Orchestrator: loop-streaming
├── Context: context-persistent
├── Providers:
│   └── provider-anthropic (claude-sonnet-4-20250514)
├── Tools:
│   ├── tool-filesystem
│   ├── tool-bash
│   └── tool-web
└── Hooks:
    └── hooks-logging (level: debug)`} language="bash" id="t7" />
            </div>
          </div>
        )}

        {contribTab === 'specs' && (
          <div className="panel">
            <h3>@hook Decorator Specification</h3>
            <CodeBlock code={`# amplifier_helpers/decorators.py
from functools import wraps
from amplifier_core.models import HookResult

def hook(events: list[str], priority: int = 100):
    """
    Decorator to create a hook handler.
    
    Args:
        events: List of event patterns (supports globs like "tool:*")
        priority: Lower runs first (default 100)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(event: str, data: dict) -> HookResult:
            result = await func(event, data)
            if result is None:
                return HookResult(action="continue")
            return result
        
        wrapper._hook_events = events
        wrapper._hook_priority = priority
        return wrapper
    return decorator

# Usage
@hook(events=["tool:pre", "tool:post"], priority=10)
async def my_hook(event: str, data: dict):
    print(f"{event}: {data}")
    # Returning None = continue`} language="python" id="s1" />

            <h3>Protocol Validator Specification</h3>
            <CodeBlock code={`# amplifier_core/validation.py
from typing import Protocol, get_type_hints, runtime_checkable
import inspect

def check_protocol(instance, protocol: type) -> tuple[bool, list[str]]:
    """
    Check if instance satisfies a Protocol.
    Returns (success, list_of_errors).
    """
    errors = []
    
    for name, expected_type in get_type_hints(protocol).items():
        if not hasattr(instance, name):
            errors.append(f"Missing: {name}")
            continue
        
        attr = getattr(instance, name)
        
        # Check if it's a property
        if isinstance(getattr(type(instance), name, None), property):
            # Validate return type
            pass
        
        # Check if method is async when expected
        if inspect.iscoroutinefunction(expected_type):
            if not inspect.iscoroutinefunction(attr):
                errors.append(f"{name}() should be async")
    
    return len(errors) == 0, errors

# CLI integration
# amplifier check my_tool.py
# -> Loads module, calls check_protocol(tool, ToolProtocol)`} language="python" id="s2" />

            <h3>Test Harness Specification</h3>
            <CodeBlock code={`# amplifier_helpers/testing.py
from amplifier_core.testing import MockCoordinator
from amplifier_core.models import ToolResult

class ToolTestHarness:
    """Simplified testing for tools."""
    
    def __init__(self, tool_class):
        self.tool = tool_class()
        self.coordinator = MockCoordinator()
    
    async def call(self, **kwargs) -> ToolResult:
        return await self.tool.execute(kwargs)
    
    def assert_success(self, result: ToolResult):
        assert result.error is None, f"Tool error: {result.error}"
    
    def assert_output_contains(self, result: ToolResult, text: str):
        assert text in result.output, f"'{text}' not in output"

# Usage
async def test_weather_tool():
    harness = ToolTestHarness(WeatherTool)
    result = await harness.call(city="Seattle")
    harness.assert_success(result)
    harness.assert_output_contains(result, "Seattle")`} language="python" id="s3" />

            <h3>Directory Structure</h3>
            <CodeBlock code={`amplifier-ecosystem/
├── amplifier-core/           # Kernel (this repo)
│   ├── amplifier_core/
│   │   ├── session.py        # AmplifierSession
│   │   ├── coordinator.py    # Coordinator
│   │   ├── hooks.py          # HookRegistry
│   │   ├── protocols.py      # Protocol definitions
│   │   ├── models.py         # ToolResult, HookResult, etc.
│   │   ├── testing.py        # MockCoordinator (NEW)
│   │   └── validation.py     # check_protocol() (NEW)
│   └── pyproject.toml
│
├── amplifier-helpers/        # Convenience utilities (NEW)
│   ├── amplifier_helpers/
│   │   ├── decorators.py     # @tool, @hook
│   │   └── testing.py        # ToolTestHarness
│   └── pyproject.toml
│
├── amplifier-app-cli/        # CLI application
│   ├── amplifier_cli/
│   │   ├── commands/
│   │   │   ├── run.py
│   │   │   ├── dev.py        # Hot reload (NEW)
│   │   │   ├── inspect.py    # Event inspector (NEW)
│   │   │   ├── scaffold.py   # Templates (NEW)
│   │   │   ├── check.py      # Validation (NEW)
│   │   │   └── plan.py       # Visualizer (NEW)
│   │   └── main.py
│   └── pyproject.toml
│
└── amplifier-profiles/       # Profile management
    └── ...`} language="text" id="s4" />
          </div>
        )}
      </section>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="site">
      <style>{`
        /* =================================================================
           DESIGN TOKENS
           ================================================================= */
        :root {
          --bg-0: #0d0d0d;
          --bg-1: #171717;
          --bg-2: #212121;
          --bg-3: #2a2a2a;
          --text-0: #fafafa;
          --text-1: #a1a1a1;
          --text-2: #6b6b6b;
          --border: #2e2e2e;
          --blue: #3b82f6;
          --green: #10b981;
          --purple: #a855f7;
          --orange: #f97316;
          --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --font-mono: 'SF Mono', 'Fira Code', 'Consolas', monospace;
          --radius: 8px;
          --transition: 150ms ease;
        }

        /* =================================================================
           RESET
           ================================================================= */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        .site {
          font-family: var(--font-sans);
          background: var(--bg-0);
          color: var(--text-0);
          min-height: 100vh;
          font-size: 15px;
          line-height: 1.6;
        }

        a { color: var(--blue); text-decoration: none; }
        a:hover { text-decoration: underline; }

        /* =================================================================
           NAV
           ================================================================= */
        .nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(13, 13, 13, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }

        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nav-left { display: flex; align-items: center; gap: 32px; }

        .nav-logo {
          font-weight: 600;
          font-size: 16px;
          color: var(--text-0);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-logo-mark {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, var(--blue), var(--green));
          border-radius: 6px;
        }

        .nav-links { display: flex; gap: 4px; }

        .nav-link {
          padding: 8px 12px;
          border-radius: 6px;
          color: var(--text-1);
          font-size: 14px;
          background: none;
          border: none;
          cursor: pointer;
          transition: all var(--transition);
        }

        .nav-link:hover { color: var(--text-0); background: var(--bg-2); }
        .nav-link.active { color: var(--text-0); background: var(--bg-2); }

        .nav-right { display: flex; align-items: center; gap: 12px; }

        .nav-github {
          padding: 8px 14px;
          border-radius: 6px;
          background: var(--bg-2);
          color: var(--text-0);
          font-size: 14px;
          border: 1px solid var(--border);
        }

        .nav-github:hover { background: var(--bg-3); text-decoration: none; }

        /* Export dropdown */
        .export-wrap { position: relative; }

        .export-btn {
          padding: 8px 14px;
          border-radius: 6px;
          background: var(--bg-2);
          color: var(--text-0);
          font-size: 14px;
          border: 1px solid var(--border);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .export-btn:hover { background: var(--bg-3); }

        .export-caret {
          font-size: 10px;
          transition: transform var(--transition);
        }

        .export-caret.open { transform: rotate(180deg); }

        .export-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          min-width: 180px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }

        .export-item {
          display: block;
          width: 100%;
          padding: 10px 14px;
          text-align: left;
          background: none;
          border: none;
          color: var(--text-0);
          font-size: 14px;
          cursor: pointer;
          transition: background var(--transition);
        }

        .export-item:hover { background: var(--bg-3); }

        .export-item span { color: var(--text-2); font-size: 12px; display: block; }

        /* =================================================================
           SECTIONS
           ================================================================= */
        .section {
          max-width: 800px;
          margin: 0 auto;
          padding: 48px 24px;
        }

        .section h1 {
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .section h2 {
          font-size: 20px;
          font-weight: 600;
          margin: 40px 0 16px;
        }

        .section h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 24px 0 12px;
          color: var(--text-0);
        }

        .section-desc {
          color: var(--text-1);
          font-size: 16px;
          margin-bottom: 32px;
        }

        .panel { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* =================================================================
           HERO
           ================================================================= */
        .hero { text-align: center; padding: 48px 0; }

        .hero-eyebrow { font-size: 13px; color: var(--text-2); margin-bottom: 16px; }

        .hero-title {
          font-size: 48px;
          font-weight: 700;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, var(--text-0) 0%, var(--text-1) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle { font-size: 20px; color: var(--text-1); margin: 8px 0 24px; }

        .hero-description {
          color: var(--text-1);
          max-width: 540px;
          margin: 0 auto 32px;
          line-height: 1.7;
        }

        .hero-actions { display: flex; justify-content: center; gap: 12px; }

        .btn-primary {
          padding: 12px 24px;
          border-radius: 8px;
          background: var(--text-0);
          color: var(--bg-0);
          font-size: 15px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all var(--transition);
        }

        .btn-primary:hover { opacity: 0.9; }

        .btn-secondary {
          padding: 12px 24px;
          border-radius: 8px;
          background: var(--bg-2);
          color: var(--text-0);
          font-size: 15px;
          font-weight: 500;
          border: 1px solid var(--border);
          text-decoration: none;
        }

        .btn-secondary:hover { background: var(--bg-3); text-decoration: none; }

        /* =================================================================
           FEATURE CARDS
           ================================================================= */
        .feature-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin: 48px 0;
        }

        .feature-card {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          padding: 24px;
          background: var(--bg-1);
          border: 1px solid var(--border);
        }

        .feature-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100px;
          background: linear-gradient(180deg, var(--accent) 0%, transparent 100%);
          opacity: 0.15;
        }

        .feature-label {
          position: relative;
          font-size: 18px;
          font-weight: 600;
          display: block;
          margin-bottom: 8px;
        }

        .feature-card p {
          position: relative;
          color: var(--text-1);
          font-size: 14px;
        }

        @media (max-width: 700px) {
          .feature-cards { grid-template-columns: 1fr; }
        }

        /* =================================================================
           QUICKSTART PREVIEW
           ================================================================= */
        .quickstart-preview {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 32px;
          margin: 48px 0;
        }

        .quickstart-preview h2 { margin: 0 0 8px; font-size: 18px; }
        .quickstart-preview .section-desc { margin-bottom: 20px; }

        /* =================================================================
           START BUILDING
           ================================================================= */
        .start-building h2 { margin: 0 0 20px; font-size: 18px; }

        .start-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .start-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 10px;
          text-align: left;
          cursor: pointer;
          transition: all var(--transition);
        }

        .start-item:hover { background: var(--bg-2); border-color: var(--text-2); }

        .start-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-2);
          border-radius: 8px;
          font-size: 16px;
          flex-shrink: 0;
        }

        .start-item strong { display: block; font-size: 14px; margin-bottom: 2px; }
        .start-item span { font-size: 13px; color: var(--text-2); }

        @media (max-width: 600px) {
          .start-grid { grid-template-columns: 1fr; }
        }

        /* =================================================================
           TABS
           ================================================================= */
        .tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .tab {
          padding: 8px 16px;
          border-radius: 6px;
          background: none;
          border: none;
          color: var(--text-1);
          font-size: 14px;
          cursor: pointer;
          transition: all var(--transition);
        }

        .tab:hover { color: var(--text-0); }
        .tab.active { background: var(--bg-2); color: var(--text-0); }

        /* =================================================================
           CODE BLOCKS
           ================================================================= */
        .code-block {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          margin: 16px 0;
        }

        .code-title {
          padding: 8px 12px;
          font-size: 12px;
          color: var(--text-2);
          background: var(--bg-2);
          font-family: var(--font-mono);
        }

        .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border);
        }

        .code-lang {
          font-size: 11px;
          color: var(--text-2);
          text-transform: uppercase;
          font-family: var(--font-mono);
        }

        .copy-btn {
          padding: 4px 10px;
          border-radius: 4px;
          background: var(--bg-3);
          border: none;
          color: var(--text-1);
          font-size: 12px;
          cursor: pointer;
        }

        .copy-btn:hover { color: var(--text-0); }

        .code-block pre { padding: 16px; overflow-x: auto; margin: 0; }

        .code-block code {
          font-family: var(--font-mono);
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-0);
        }

        /* =================================================================
           INFO BOX
           ================================================================= */
        .info-box {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px 20px;
          margin: 24px 0;
        }

        .info-box strong { display: block; margin-bottom: 8px; }
        .info-box ul { margin: 0; padding-left: 20px; color: var(--text-1); }
        .info-box li { margin: 4px 0; }
        .info-box code { background: var(--bg-2); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-size: 13px; }

        .mini-table { width: 100%; margin-top: 8px; }
        .mini-table td { padding: 4px 0; font-size: 13px; }
        .mini-table td:first-child { color: var(--text-0); }
        .mini-table td:last-child { color: var(--text-2); }
        .mini-table code { background: var(--bg-2); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); }

        /* =================================================================
           ARCHITECTURE
           ================================================================= */
        .arch-layers { margin: 32px 0; }

        .arch-layer {
          background: var(--bg-1);
          border: 1px solid var(--layer-color);
          border-radius: 10px;
          padding: 16px 20px;
        }

        .layer-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 6px;
        }

        .layer-badge { font-size: 13px; font-weight: 600; color: var(--layer-color); }

        .layer-pkg {
          font-size: 12px;
          color: var(--text-2);
          font-family: var(--font-mono);
        }

        .arch-layer p { color: var(--text-1); font-size: 14px; margin: 0; }

        .arch-connector {
          text-align: center;
          color: var(--text-2);
          padding: 8px 0;
          font-size: 14px;
        }

        .concepts {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin: 24px 0;
        }

        .concept {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 20px;
        }

        .concept h3 { margin: 0 0 8px; font-size: 15px; }
        .concept p { color: var(--text-1); font-size: 14px; margin-bottom: 12px; }
        .concept ul, .concept ol { padding-left: 18px; color: var(--text-1); font-size: 14px; }
        .concept li { margin: 4px 0; }
        .concept code { background: var(--bg-2); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-size: 12px; color: var(--blue); }

        .event-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .event-tags span { background: var(--bg-2); padding: 4px 10px; border-radius: 4px; font-size: 12px; font-family: var(--font-mono); color: var(--green); }

        @media (max-width: 600px) {
          .concepts { grid-template-columns: 1fr; }
        }

        .litmus {
          background: var(--bg-1);
          border: 1px solid var(--green);
          border-radius: 10px;
          padding: 24px;
          text-align: center;
          margin: 32px 0;
        }

        .litmus h3 { margin: 0 0 12px; color: var(--green); }
        .litmus p { margin: 4px 0; color: var(--text-1); }
        .litmus strong { color: var(--text-0); }

        /* =================================================================
           REFERENCE
           ================================================================= */
        .contracts {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin: 24px 0;
        }

        .contract {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 16px;
        }

        .contract h4 {
          font-size: 14px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .contract h4 span { font-weight: 400; font-size: 12px; color: var(--text-2); }

        .contract code {
          display: block;
          background: var(--bg-2);
          padding: 6px 10px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-1);
          margin: 4px 0;
        }

        @media (max-width: 600px) {
          .contracts { grid-template-columns: 1fr; }
        }

        .actions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin: 20px 0;
        }

        .action {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
        }

        .action code { font-family: var(--font-mono); font-size: 14px; color: var(--blue); }
        .action span { display: block; font-size: 13px; color: var(--text-2); margin-top: 4px; }

        .event-groups {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin: 24px 0;
        }

        .event-group {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
        }

        .event-group h4 { font-size: 13px; margin-bottom: 10px; color: var(--text-0); }

        .event-group code {
          display: block;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--green);
          margin: 4px 0;
        }

        @media (max-width: 700px) {
          .event-groups { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 500px) {
          .event-groups { grid-template-columns: 1fr; }
        }

        /* =================================================================
           CLI
           ================================================================= */
        .cli-groups {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin: 24px 0;
        }

        .cli-group {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 20px;
        }

        .cli-group h3 { font-size: 14px; margin-bottom: 14px; }

        .cli-item {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }

        .cli-item:last-child { border-bottom: none; }

        .cli-item code { font-family: var(--font-mono); font-size: 13px; color: var(--green); }
        .cli-item span { font-size: 13px; color: var(--text-2); }

        @media (max-width: 600px) {
          .cli-groups { grid-template-columns: 1fr; }
        }

        /* =================================================================
           EXAMPLES
           ================================================================= */
        .examples {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin: 24px 0;
        }

        .example {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 20px;
        }

        .example h3 { font-size: 15px; margin-bottom: 6px; }
        .example > p { font-size: 13px; color: var(--text-2); margin-bottom: 12px; }

        @media (max-width: 700px) {
          .examples { grid-template-columns: 1fr; }
        }

        /* =================================================================
           CONTRIBUTE
           ================================================================= */
        .callout {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.05));
          border: 1px solid var(--blue);
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .callout p { margin: 0; color: var(--text-1); }
        .callout strong { color: var(--text-0); }
        .callout em { color: var(--blue); font-style: normal; }

        .contrib-table { width: 100%; border-collapse: collapse; margin: 16px 0; }

        .contrib-table th, .contrib-table td {
          text-align: left;
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          font-size: 14px;
        }

        .contrib-table th {
          background: var(--bg-2);
          color: var(--text-2);
          font-size: 12px;
          text-transform: uppercase;
        }

        .contrib-table .done { color: var(--green); }
        .contrib-table .needed { color: var(--orange); }

        .personas {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin: 20px 0;
        }

        .persona {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
        }

        .persona strong { display: block; margin-bottom: 6px; }
        .persona p { margin: 0; font-size: 13px; color: var(--text-2); }

        @media (max-width: 700px) {
          .personas { grid-template-columns: 1fr; }
        }

        .task {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 20px;
          margin: 16px 0;
        }

        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .task-title { font-weight: 600; }

        .task-layer {
          font-size: 12px;
          padding: 4px 10px;
          background: var(--bg-2);
          border-radius: 4px;
          color: var(--text-2);
          font-family: var(--font-mono);
        }

        .task > p { color: var(--text-1); font-size: 14px; margin-bottom: 12px; }

        /* =================================================================
           FOOTER
           ================================================================= */
        .footer {
          border-top: 1px solid var(--border);
          padding: 32px 24px;
          text-align: center;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-bottom: 12px;
        }

        .footer-links a { color: var(--text-2); font-size: 14px; }
        .footer-links a:hover { color: var(--text-0); }

        .footer-copy { color: var(--text-2); font-size: 13px; }

        @media (max-width: 900px) {
          .nav-links { display: none; }
        }
      `}</style>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-left">
            <div className="nav-logo">
              <div className="nav-logo-mark"></div>
              Amplifier
            </div>
            <div className="nav-links">
              {sections.map((s) => (
                <button
                  key={s.id}
                  className={`nav-link ${activeSection === s.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="nav-right">
            <div className="export-wrap" ref={exportRef}>
              <button className="export-btn" onClick={() => setExportMenuOpen(!exportMenuOpen)}>
                {copied ? '✓ Copied' : 'Export'}
                <span className={`export-caret ${exportMenuOpen ? 'open' : ''}`}>▼</span>
              </button>
              {exportMenuOpen && (
                <div className="export-menu">
                  <button className="export-item" onClick={handleCopyMarkdown}>
                    Copy as Markdown
                    <span>For agents.md / claude.md</span>
                  </button>
                  <button className="export-item" onClick={handleDownloadMarkdown}>
                    Download amplifier.md
                    <span>Agent reference file</span>
                  </button>
                  <button className="export-item" onClick={handleDownloadFullGuide}>
                    Download amplifier-fullguide.md
                    <span>Complete documentation</span>
                  </button>
                </div>
              )}
            </div>
            <a href="https://github.com/microsoft/amplifier-core" className="nav-github" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {activeSection === 'home' && <HomeSection />}
        {activeSection === 'quickstart' && <QuickstartSection />}
        {activeSection === 'architecture' && <ArchitectureSection />}
        {activeSection === 'reference' && <ReferenceSection />}
        {activeSection === 'cli' && <CLISection />}
        {activeSection === 'examples' && <ExamplesSection />}
        {activeSection === 'contribute' && <ContributeSection />}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-links">
          <a href="https://github.com/microsoft/amplifier-core" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://github.com/microsoft/amplifier-core/issues" target="_blank" rel="noopener noreferrer">Issues</a>
          <a href="https://github.com/microsoft/amplifier" target="_blank" rel="noopener noreferrer">Full Amplifier</a>
        </div>
        <p className="footer-copy">© Microsoft Corporation · MIT License</p>
      </footer>
    </div>
  );
};
