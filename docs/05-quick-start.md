# 5-Minute Understanding

You're busy. Here's Amplifier in 5 minutes.

---

## The One-Sentence Version

> Amplifier is a framework for building AI coding assistants by composing modular pieces (providers, tools, hooks) through configuration files called profiles.

---

## See It Working

Want to see this in action right now? Clone and run **[amplifier-simplecli](https://github.com/michaeljabbour/amplifier-simplecli)**:

```bash
git clone https://github.com/michaeljabbour/amplifier-simplecli
cd amplifier-simplecli
python simple_cli.py --init
python simple_cli.py
```

This is a complete working CLI with:
- 14 pre-configured modules (orchestrator, providers, tools, hooks)
- Memory system that learns across sessions
- Interactive terminal UI with Rich
- Bundle composition (base.md + opus.yaml)

Study the source to see exactly how it all fits together.

---

## The 30-Second Version

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  You write a PROFILE (a YAML file) that says:                       │
│                                                                     │
│    "Use Claude for the brain,                                       │
│     give it filesystem and bash tools,                              │
│     and log everything."                                            │
│                                                                     │
│  Amplifier turns that into a working AI assistant.                  │
│                                                                     │
│  When you run it:                                                   │
│    1. You ask a question                                            │
│    2. The LLM thinks and maybe calls tools                          │
│    3. Tools do things (read files, run commands)                    │
│    4. The LLM synthesizes an answer                                 │
│    5. You get a response                                            │
│                                                                     │
│  That's it.                                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The 2-Minute Version

### Five Things, That's All

Amplifier has exactly five types of components:

| Type | What It Does | Example |
|------|--------------|---------|
| **Provider** | Talks to LLMs | `provider-anthropic` (calls Claude) |
| **Tool** | Does actions | `tool-filesystem` (reads/writes files) |
| **Context** | Remembers history | `context-simple` (stores messages) |
| **Orchestrator** | Runs the loop | `loop-streaming` (think → act → repeat) |
| **Hook** | Watches everything | `hooks-logging` (logs all events) |

### Configuration in Three Tiers

Settings come from three places, merged in order:

```
~/.amplifier/settings.yaml       → User defaults
.amplifier/settings.yaml         → Project settings
.amplifier/settings.local.yaml   → Local overrides (gitignored)
```

More specific wins.

### Profiles Define Sessions

Profiles configure sessions (modules, providers, hooks). Recipes are separate declarative workflows referenced by profiles or bundles.

```yaml
---
name: my-assistant
version: "1.0"
providers:
  - module: provider-anthropic
tools:
  - module: tool-filesystem
  - module: tool-bash
hooks:
  - module: hooks-logging
---

You are a helpful coding assistant.
```

**Run it:**
- Official CLI: `amplifier run --profile my-assistant "Help me refactor this"`
- Working example: See [amplifier-simplecli](https://github.com/michaeljabbour/amplifier-simplecli) for bundle-based approach

Need a multi-step workflow? Create a **recipe** (`recipes/*.yaml`), package it inside a bundle, and reference it from a profile or invoke it as a tool. See [`08-asset-model.md`](./08-asset-model.md).

---

## The 5-Minute Version

### How It Actually Works

```
                YOUR QUESTION
                     │
                     ▼
              ┌─────────────┐
              │   Profile   │  ← Defines what modules to load
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │   Session   │  ← Running instance
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │Provider │  │  Tools  │  │  Hooks  │
   │  (LLM)  │  │(actions)│  │(observe)│
   └────┬────┘  └────┬────┘  └────┬────┘
        │            │            │
        └────────────┼────────────┘
                     │
                     ▼
              ┌─────────────┐
              │Orchestrator │  ← Runs the think/act loop
              └──────┬──────┘
                     │
                     ▼
                YOUR ANSWER
```

### The Loop

1. **You ask something**
2. **Orchestrator sends messages to Provider**
3. **Provider (LLM) responds** - might request tool calls
4. **If tool calls requested:**
   - Hooks see the request (can block)
   - Tool executes
   - Hooks see the result
   - Result goes back to Provider
   - **Go to step 2**
5. **If no tool calls:** Response returned, done

### Why Hooks Matter

Hooks observe everything. They fire on events:

| Event | When It Fires |
|-------|---------------|
| `session:start` | New session begins |
| `prompt:submit` | User sends a message |
| `tool:pre` | Before any tool runs |
| `tool:post` | After any tool completes |
| `provider:request` | Before LLM API call |
| `provider:response` | After LLM responds |

A hook can return `{action: "deny"}` on `tool:pre` to block execution.

### Why Profiles Matter

Profiles let you:
- **Share configurations** - Team uses same setup
- **Inherit** - `extends: base-profile` builds on another
- **Customize** - Different profiles for different tasks
- **Version** - Track profile changes over time

---

## Now What?

| Goal | Start Here |
|------|-----------|
| Understand the architecture deeply | [How Data Flows](./01-data-flow.md) |
| Know what you can rely on | [The Certainties](./02-certainties.md) |
| Get the right mental model | [Mental Models](./03-mental-models.md) |
| See real examples | [What Happens When](./04-what-happens-when.md) |
| Build something | [Getting Started](../index.html#quickstart) |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│  AMPLIFIER CHEAT SHEET                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  COMPONENTS                                                         │
│    Provider    = LLM brain                                          │
│    Tool        = Action executor                                    │
│    Context     = Message memory                                     │
│    Orchestrator= Loop controller                                    │
│    Hook        = Event observer                                     │
│                                                                     │
│  CONFIG HIERARCHY (more specific wins)                              │
│    defaults < user < project < local < runtime                      │
│                                                                     │
│  KEY EVENTS                                                         │
│    tool:pre    Before tool runs (can block)                         │
│    tool:post   After tool completes                                 │
│                                                                     │
│  PROFILE STRUCTURE                                                  │
│    ---                                                              │
│    name: string                                                     │
│    extends: optional-parent                                         │
│    providers: [{module: string}]                                    │
│    tools: [{module: string}]                                        │
│    hooks: [{module: string}]                                        │
│    ---                                                              │
│    System prompt in markdown body                                   │
│                                                                     │
│  COMMANDS (official CLI)                                            │
│    amplifier run "prompt"                                           │
│    amplifier run --profile name "prompt"                            │
│    amplifier session list                                           │
│    amplifier profile list                                           │
│                                                                     │
│  WORKING EXAMPLE                                                    │
│    github.com/michaeljabbour/amplifier-simplecli                    │
│    python simple_cli.py   (bundle-based approach)                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

**Time's up.** You now understand Amplifier well enough to use it. The rest is details.

**Next:** [Layers of Understanding →](./06-layers.md) - Progressive depth for when you need more
