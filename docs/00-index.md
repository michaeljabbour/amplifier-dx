# Understanding Amplifier

A progressive guide from "what is this?" to "I could build this."

---

## Start Here

| Time | Read This |
|------|-----------|
| **5 minutes** | [5-Minute Understanding](./05-quick-start.md) - The essentials, fast |
| **15 minutes** | [How Data Flows](./01-data-flow.md) - Visual walkthrough |
| **30 minutes** | [What Happens When](./04-what-happens-when.md) - Concrete scenarios |

---

## The Documents

### Core Concepts

1. **[How Data Flows](./01-data-flow.md)**
   Visual diagrams tracing a prompt through the entire system.

2. **[The Certainties](./02-certainties.md)**
   What you can rely on. Contracts, not implementation details.

3. **[Mental Models](./03-mental-models.md)**
   Helpful analogies: Orchestra, Kitchen, Airport, Lego, Assembly Line.

4. **[What Happens When...](./04-what-happens-when.md)**
   Real scenarios traced step by step.

### Getting Started

5. **[5-Minute Understanding](./05-quick-start.md)**
   The essentials for busy people.

6. **[Layers of Understanding](./06-layers.md)**
   Progressive depth: Use → Configure → Extend → Embed → Understand.

### Real-World

7. **[Embedding Amplifier: A Case Study](./07-desktop-case-study.md)**
   How real apps (amplifierd, amplifier-chat, amplifier-voice) embed Amplifier in a non-CLI host process.

8. **[Architecture Boundaries](./08-architecture-boundaries.md)**
   What belongs where: app layer, kernel layer, and module layer.

9. **[Ecosystem Quick Map](./09-ecosystem-quick-map.md)**
   Three-repo architecture at a glance: core, foundation, and app-cli roles, dependency order, and troubleshooting by layer.

10. **[Amplifier Philosophy](./10-philosophy.md)**
    Seven Pillars, the Vibe Coder vs Amplifier Coder framework, and the emotional arc of each approach.

11. **[Developing Judgment](./11-developing-judgment.md)**
    Trust calibration, intuition, and the skill of working with AI agents over time.

12. **[Current Ecosystem](./12-current-ecosystem.md)**
    Verified inventory of applications, bundles, and runtime modules with GitHub links and the diagrams that visualize how they fit together.

13. **[Working with AI](./13-working-with-ai.md)**
    Practical comparison of vibe coding and structured AI-assisted development.

14. **[Built With Amplifier: A Case Study](./14-built-with-amplifier.md)**
    The recursive loop of `amplifier-app-learn` (a private repository) — a curriculum that teaches Amplifier, audited and maintained by Amplifier expert agents, with diagrams from validated DOT sources and an update plan structured as a staged recipe.

15. **[A Working Setup](./15-a-working-setup.md)**
    What one real install composes: the root, the behaviors layered on it, community capabilities, and the names that mislead.

---

## Reading Paths

### "I just want to use it"
```
5-Minute Understanding → [main docs quickstart]
```

### "I need to configure it for my team"
```
5-Minute Understanding → How Data Flows → [main docs bundles]
```

### "I want to write a custom tool"
```
Layers of Understanding (Layer 3) → amplifier-modulebuilder-skill → [main docs creating modules]
```

### "I'm building a product on Amplifier"
```
How Data Flows → The Certainties → Embedding Amplifier Case Study → [API docs]
```

### "I want to understand everything"
```
All documents in order → source code
```

---

## Learning Resources

### Agent Skills

These skills teach Amplifier patterns through AI-assisted learning. They are community
repositories, not part of the Microsoft catalog, and have not been re-checked against the
current bundle format (see [Current Ecosystem](./12-current-ecosystem.md) for what is verified):

- **[amplifier-cli-skill](https://github.com/michaeljabbour/amplifier-cli-skill)** (archived, read-only) - Build CLI applications with amplifier-foundation
  - Bundle composition and session orchestration
  - Module usage patterns and production best practices
  - Memory systems, hooks, and terminal UI

- **[amplifier-modulebuilder-skill](https://github.com/michaeljabbour/amplifier-modulebuilder-skill)** (last updated December 2025; predates the current bundle format) - Build amplifier-foundation modules
  - Create custom tools, hooks, providers, contexts, orchestrators
  - "Bricks and studs" architecture patterns
  - Testing strategies (60/30/10 pyramid)

### Reference Implementations

See these patterns in action:

- **[amplifier-foundation examples](https://github.com/microsoft/amplifier-foundation/tree/main/examples)** - Runnable scripts maintained with the library
  - `examples/01_hello_world.py`: load a bundle, compose a provider, execute a prompt
  - `examples/08_cli_application.py`: CLI application architecture
  - `examples/13_event_debugging.py`: observe the event flow with hooks

### Suggested Learning Path

**For CLI application builders:**
```
5-Minute Understanding → amplifier-foundation examples (see it working) → build your CLI
```

**For module developers:**
```
amplifier-modulebuilder-skill → build a module → list it in a bundle and run it with the official CLI
```

---

## Quick Reference

### The Five Components

| Component | Role | Interface |
|-----------|------|-----------|
| **Provider** | Talks to LLMs | `complete(request: ChatRequest) → ChatResponse` |
| **Tool** | Executes actions | `execute(input: dict) → ToolResult` |
| **Context** | Remembers history | `get_messages()`, `add_message()` |
| **Orchestrator** | Runs the loop | `execute() → final_response` |
| **Hook** | Observes events, can intervene | `async __call__(event: str, data: dict) → HookResult` |

These five are the kernel's module types. Bundles also carry agents, context files and
behaviors, and modes, skills, recipes and model routing are configuration layered on top
of them.

### Config Hierarchy

```
~/.amplifier/settings.yaml < .amplifier/settings.yaml < .amplifier/settings.local.yaml < session settings.yaml < CLI flags
```

Project and local files are read from the exact working directory; there is no upward search.

### Key Events

| Event | When | Hook Can Block? |
|-------|------|-----------------|
| `session:start` | Session begins | No |
| `prompt:submit` | User sends message | No |
| `tool:pre` | Before tool runs | **Yes** |
| `tool:post` | After tool completes | No |
| `provider:request` | Before LLM call | No |
| `provider:response` | After LLM responds | No |
| `prompt:complete` | Response ready | No |
| `session:end` | Session closes | No |

Note: `provider:response` and `prompt:complete` are canonical event names, but the installed `loop-streaming` orchestrator emits neither. Providers emit `llm:request` / `llm:response`, and the end of a turn is marked by `orchestrator:complete`.

---

## Contributing

See something missing? Found an error? [Contribute](../index.html#contributing).
