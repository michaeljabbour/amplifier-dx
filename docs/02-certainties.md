# The Certainties

These are the things you can absolutely rely on. Not implementation details that might change - these are **contracts**. Build your systems on them.

**Verified against:** the guarantees below were checked against the amplifier-core 2.0.2 source and the installed amplifier-app-cli 2026.09.06.

## Why This Page Exists

Documentation usually tells you what *is*. This page tells you what *will always be*. When you're building on top of a platform, you need to know which behaviors are guaranteed versus which are just how things happen to work today.

---

## The Guarantees

### 1. Hooks Always Fire

```
┌─────────────────────────────────────────────────────────────┐
│                    HOOK GUARANTEE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Every compliant orchestrator emits, for each tool call:    │
│                                                             │
│    tool:pre  →  tool execution  →  tool:post                │
│                 (tool:error on failure)                     │
│                                                             │
│  Each time an event is emitted, the kernel calls every      │
│  registered handler, in priority order.                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Kernel contract vs. orchestrator contract:** Emitting `tool:pre` and `tool:post` is a contract on orchestrator modules; the kernel does not itself intercept tool calls. What the kernel guarantees is dispatch: every handler registered for an event is called, in priority order, each time that event is emitted (a `deny` stops dispatch, so later handlers do not run).

**What this means for you:**
- You can build comprehensive audit logging
- You can implement approval workflows that the LLM cannot talk its way around
- You can create security policies that apply to every tool call a compliant orchestrator makes

**Example:** If you write a hook that blocks `bash` commands containing `rm -rf`, that hook runs before any bash execution under a compliant orchestrator. The LLM cannot skip it. Note that dispatch is fail-open: if your hook raises an exception it is logged and skipped, so a safety hook must catch its own errors and return `deny`.

---

### 2. Events Are Ordered

```
┌─────────────────────────────────────────────────────────────┐
│                   ORDER GUARANTEE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Events fire in deterministic sequence:                     │
│                                                             │
│    session:start            (first execute() only)          │
│    └── execution:start                                      │
│        └── prompt:submit                                    │
│            └── provider:request                             │
│                └── llm:request                              │
│                    └── llm:response                         │
│                        └── tool:pre                         │
│                            └── tool:post                    │
│                                └── ... (loop until done)    │
│        └── orchestrator:complete                            │
│    └── execution:end                                        │
│    session:end              (at session.cleanup())          │
│                                                             │
│  If A causes B, A's event fires before B's. Always.         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Kernel contract vs. orchestrator convention:** The kernel fixes where `session:start` (first `execute()`) and `session:end` (cleanup) fall, and runs the handlers for any one event sequentially in priority order. The orchestrator contract fixes `execution:start` first, and `orchestrator:complete` and `execution:end` last. The sequence in between is what the standard `loop-streaming` orchestrator and its provider emit; another orchestrator may differ.

**What this means for you:**
- Event logs tell a true story
- You can reconstruct exactly what happened, in order
- Debugging is deterministic

---

### 3. Context Is Append-Only

```
┌─────────────────────────────────────────────────────────────┐
│                  CONTEXT GUARANTEE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stored history is never rewritten by compaction.           │
│                                                             │
│  Your conversation:                                         │
│    [user] → [assistant] → [user] → [assistant] → ...        │
│                                                             │
│  When the conversation exceeds the budget:                  │
│    - get_messages_for_request() automatically returns       │
│      a compacted view for the LLM                           │
│    - get_messages() still returns the full history          │
│                                                             │
│  Compaction is announced, not invisible:                    │
│    context:pre_compact  →  context:post_compact             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

This is the context manager contract: compaction happens automatically inside `get_messages_for_request()` and must be non-destructive. The protocol also has `set_messages()` (used on resume) and `clear()`, which do change stored history when a module or app calls them.

**What this means for you:**
- The full history stays inspectable
- What the LLM sees on a given request is decided by the context manager module you configured
- Compaction is observable through `context:pre_compact` and `context:post_compact`

---

### 4. Tools Are Isolated

```
┌─────────────────────────────────────────────────────────────┐
│                 ISOLATION GUARANTEE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tools should not:                                          │
│    ✗ See other tools' internal state                        │
│    ✗ Modify other tools' behavior                           │
│    ✗ Access each other's configuration directly             │
│                                                             │
│  Tools are meant to:                                        │
│    ✓ Receive input from the orchestrator                    │
│    ✓ Return output to the orchestrator                      │
│    ✓ Depend only on the kernel, never on each other         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**This is a design rule, not a sandbox.** Modules may depend only on the kernel, and well-behaved tools do not reach into each other. Nothing enforces it at runtime: every module's `mount()` receives the coordinator, which exposes `get('tools')`, capabilities and the hook registry.

**What this means for you:**
- Tools are composable without interference
- Adding a new tool never breaks existing tools
- You can reason about each tool independently

---

### 5. Provider Responses Are Treated as Immutable (Convention)

```
┌─────────────────────────────────────────────────────────────┐
│                IMMUTABILITY CONVENTION                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  This one is a convention, not a kernel guarantee.          │
│                                                             │
│  Hooks are given event data and may return:                 │
│    - modify          (changed event data)                   │
│    - inject_context  (extra messages)                       │
│                                                             │
│  The kernel does not provide an immutability guarantee      │
│  for provider responses. How a response is recorded is      │
│  up to the orchestrator and context modules you install.    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**What this means for you:**
- Whether transcripts record provider responses as-is depends on the modules you install
- Event data handed to a hook is what the emitter supplied, possibly changed by an earlier hook's `modify`
- Don't treat the transcript or event log as tamper-evident on the kernel's word alone; check the modules in your mount plan

---

### 6. Configuration Hierarchy Is Deterministic

```
┌─────────────────────────────────────────────────────────────┐
│                 CONFIG GUARANTEE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Configuration merges in this exact order:                  │
│                                                             │
│    ~/.amplifier/settings.yaml         (global)              │
│       ↓ overridden by                                       │
│    .amplifier/settings.yaml           (project)             │
│       ↓ overridden by                                       │
│    .amplifier/settings.local.yaml     (local/gitignored)    │
│       ↓ overridden by                                       │
│    <session dir>/settings.yaml        (session)             │
│       ↓ overridden by                                       │
│    CLI flags such as -B, -p, -m       (this invocation)     │
│                                                             │
│  More specific always wins. No exceptions.                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

This merge is done by the application layer (the order shown is the official CLI's). The project scope is the exact working directory; there is no upward search. The kernel receives one already-resolved mount plan.

**What this means for you:**
- You always know which setting will apply
- Teams can share project configs while keeping local overrides
- Runtime overrides are always possible

---

### 7. Hooks Can Block, Tools Cannot

```
┌─────────────────────────────────────────────────────────────┐
│                  CONTROL GUARANTEE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Only hooks return a HookResult, so only hooks can          │
│  "deny" or "ask_user".                                      │
│                                                             │
│  Tools report failure with                                  │
│    ToolResult(success=False, error={...})                   │
│                                                             │
│  This means:                                                │
│    - Security is centralized in hooks                       │
│    - Tools focus on doing, not deciding                     │
│    - Policy is separate from implementation                 │
│                                                             │
│  A tool might fail (error). That's different from blocked.  │
│  Blocked = policy said no. Failed = execution problem.      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**What this means for you:**
- Security policies live in one place (hooks)
- Clear separation of concerns
- You know exactly where to look for access control

---

## What We Don't Guarantee

Honesty builds trust. Here's what might change:

| Not Guaranteed | Why | What to Do Instead |
|----------------|-----|-------------------|
| **Events beyond the canonical 43** | The 43 canonical event names are stable constants in `amplifier_core.events`, but modules may add custom events | Handlers are registered per exact event name (there is no wildcard); to observe everything, register for each name in `ALL_EVENTS` |
| **Response format details** | LLM outputs evolve | Parse defensively, handle unknowns gracefully |
| **Tool execution order** | When multiple tools are called, order may vary | Don't rely on tool A running before tool B |
| **Timing** | Performance varies by load, model, network | Never depend on specific latencies |
| **Default module versions** | Defaults improve over time | Pin versions in production bundles |
| **Internal data structures** | Implementation details change | Use the public APIs, not internal inspection |

---

## Testing the Guarantees

You don't have to take our word for it. Here's how to verify:

### Using the Official CLI

```bash
# Hooks come from the active bundle (there is no --hooks flag),
# and every session writes an event log
amplifier run "Do something with files"

# Check the event log - every tool call has tool:pre and tool:post
cat ~/.amplifier/projects/*/sessions/*/events.jsonl | grep "tool:"
```

```bash
# Run with the full execution trace to see events and their timestamps
amplifier run --output-format json-trace "List files and count them"

# Timestamps are monotonically increasing for causal chains
```

```bash
# Set a different bundle at two scopes and check which wins
# (this rewrites your global bundle setting; note `amplifier bundle current` first)
amplifier bundle use anchors --global
amplifier bundle use foundation --project
amplifier bundle current           # Shows foundation (project wins)
amplifier bundle clear --project   # Undo the project setting
```

---

## Building on Certainties

When you build systems on Amplifier, lean into these guarantees:

```
┌─────────────────────────────────────────────────────────────┐
│  BUILDING PATTERNS                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ Audit logging         →  Use hook guarantees             │
│  ✓ Access control        →  Use hook blocking               │
│  ✓ Debugging             →  Use event ordering              │
│  ✓ History inspection    →  Use context append-only         │
│  ✓ Multi-environment     →  Use config hierarchy            │
│  ✓ Plugin architecture   →  Use tool isolation              │
│                                                             │
│  Don't fight the architecture. Work with it.                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**Previous:** [How Data Flows](./01-data-flow.md)
**Next:** [Mental Models →](./03-mental-models.md) - Helpful analogies for understanding the system
