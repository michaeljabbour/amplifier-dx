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

7. **[Amplifier Desktop Case Study](./07-desktop-case-study.md)**
   How a production desktop app embeds Amplifier.

8. **[Asset Model](./08-asset-model.md)**
   Canonical definitions of bundles, recipes, profiles, and collections (plus migration guidance).

9. **[Module Resolution](./09-module-resolution.md)**
   How modules load across bundled, user, and project scopes; execution modes and plugin manifests.

10. **[Transport Contracts](./10-transport-contracts.md)**
    WebSocket/REST schemas for Desktop ↔ sidecar communication.

11. **[Runtime Ownership](./11-runtime-ownership.md)**
    Table showing which repo/file owns each category of state.

12. **[Testing Matrix](./12-testing-matrix.md)**
    Required test suites per layer/epic.

---

## Reading Paths

### "I just want to use it"
```
5-Minute Understanding → [main docs quickstart]
```

### "I need to configure it for my team"
```
5-Minute Understanding → How Data Flows → [main docs profiles]
```

### "I want to write a custom tool"
```
Layers of Understanding (Layer 3) → [main docs creating modules]
```

### "I'm building a product on Amplifier"
```
How Data Flows → The Certainties → Desktop Case Study → [API docs]
```

### "I want to understand everything"
```
All documents in order → source code
```

---

## Quick Reference

### The Five Components

| Component | Role | Interface |
|-----------|------|-----------|
| **Provider** | Talks to LLMs | `complete(messages) → response` |
| **Tool** | Executes actions | `execute(input) → result` |
| **Context** | Remembers history | `get_messages()`, `add_message()` |
| **Orchestrator** | Runs the loop | `execute() → final_response` |
| **Hook** | Observes events | `on_event(event) → action` |

### Config Hierarchy

```
defaults < ~/.amplifier/ < .amplifier/ < .amplifier/*.local.yaml < runtime
```

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

---

## Contributing

See something missing? Found an error? [Contribute](../index.html#contributing).
