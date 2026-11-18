# 5-Minute Understanding

You're busy. Here's Amplifier in 5 minutes.

---

## The One-Sentence Version

> Amplifier is a framework for building AI coding assistants by composing modular pieces (providers, tools, hooks) through configuration files called bundles.

---

## See It Working

Want to see this in action right now? Install the official CLI and run a prompt:

```bash
uv tool install git+https://github.com/microsoft/amplifier
amplifier init
amplifier run "List the Python files in this directory"
```

Prefer to read code? The [amplifier-foundation examples](https://github.com/microsoft/amplifier-foundation/tree/main/examples) are runnable
scripts. `examples/01_hello_world.py` is the shortest: load a bundle, compose it with a
provider, execute a prompt.

---

## The 30-Second Version

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  You write a BUNDLE (a YAML/MD file) that says:                     │
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

Amplifier has exactly five types of runtime module:

| Type | What It Does | Example |
|------|--------------|---------|
| **Provider** | Talks to LLMs | `provider-anthropic` (calls Claude) |
| **Tool** | Does actions | `tool-filesystem` (reads/writes files) |
| **Context** | Remembers history | `context-simple` (stores messages) |
| **Orchestrator** | Runs the loop | `loop-streaming` (think → act → repeat) |
| **Hook** | Watches everything | `hooks-logging` (logs all events) |

Agents, behaviors, modes, skills and recipes are configuration layered on those five.

### Configuration in Four Scopes

Settings come from four places, merged in order:

```
~/.amplifier/settings.yaml       → Global (user defaults)
.amplifier/settings.yaml         → Project settings
.amplifier/settings.local.yaml   → Local overrides (gitignored)
~/.amplifier/projects/<slug>/sessions/<id>/settings.yaml
                                 → Session overrides
```

More specific wins.

### Bundles Define Sessions

Bundles configure sessions (modules, agents, context, hooks). Recipes are separate declarative workflows run by the `recipes` tool and often packaged inside bundles.

```yaml
---
bundle:
  name: my-assistant
  version: 1.0.0

session:
  orchestrator:
    module: loop-basic
    source: git+https://github.com/microsoft/amplifier-module-loop-basic@main
  context:
    module: context-simple
    source: git+https://github.com/microsoft/amplifier-module-context-simple@main

tools:
  - module: tool-filesystem
    source: git+https://github.com/microsoft/amplifier-module-tool-filesystem@main
  - module: tool-bash
    source: git+https://github.com/microsoft/amplifier-module-tool-bash@main

hooks:
  - module: hooks-logging
    source: git+https://github.com/microsoft/amplifier-module-hooks-logging@main
---

You are a helpful coding assistant.
```

Every module names its `source`. The provider is left out on purpose: it comes from your
settings (`amplifier init`). A bundle that does not choose its own `session.orchestrator`
and `session.context` has to include a complete root that does, such as Anchors.

**Run it:**
- Official CLI: `amplifier run --bundle ./my-assistant.md "Help me refactor this"` (or register it first with `amplifier bundle add file:///path/to/bundle`)
- From Python: see `examples/01_hello_world.py` in the [amplifier-foundation examples](https://github.com/microsoft/amplifier-foundation/tree/main/examples)

Need a multi-step workflow? Write a **recipe** (a YAML file, conventionally `recipes/*.yaml` inside a bundle) and run it with the `recipes` tool, for example `amplifier tool invoke recipes operation=execute recipe_path=<path or namespace:recipes/x.yaml>`. New recipes with `agent:` steps carry a `schema_version: 2` header. See [Layers of Understanding](./06-layers.md).

---

## The 5-Minute Version

### How It Actually Works

```
                YOUR QUESTION
                     │
                     ▼
              ┌─────────────┐
              │   Bundle    │  ← Defines what modules to load
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

Note: `provider:response` is a canonical event name (as is `prompt:complete`), but the installed `loop-streaming` orchestrator emits neither. Providers emit `llm:request` / `llm:response`.

A hook can return `{action: "deny"}` on `tool:pre` to block execution.

### Why Bundles Matter

Bundles let you:
- **Share configurations** - Team uses same setup
- **Compose** - `includes:` layers other bundles and behaviors
- **Customize** - Different bundles for different tasks
- **Version** - Track bundle changes over time

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
│    global < project < local < session < CLI flags                   │
│                                                                     │
│  KEY EVENTS                                                         │
│    tool:pre    Before tool runs (can block)                         │
│    tool:post   After tool completes                                 │
│                                                                     │
│  BUNDLE STRUCTURE                                                  │
│    ---                                                              │
│    bundle: {name, version}                                          │
│    includes: [{bundle: uri}]                                        │
│    session: {orchestrator, context}                                 │
│    providers / tools / hooks: [{module, source, config}]            │
│    agents: {include: [...]}                                         │
│    context: {include: [...]}                                        │
│    ---                                                              │
│    System prompt in markdown body                                   │
│                                                                     │
│  COMMANDS (official CLI)                                            │
│    amplifier run "prompt"                                           │
│    amplifier run --bundle name "prompt"                            │
│    amplifier session list                                           │
│    amplifier bundle list                                           │
│                                                                     │
│  WORKING EXAMPLE                                                    │
│    github.com/microsoft/amplifier-foundation                        │
│    examples/01_hello_world.py                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

**Time's up.** You now understand Amplifier well enough to use it. The rest is details.

**Next:** [Layers of Understanding →](./06-layers.md) - Progressive depth for when you need more
