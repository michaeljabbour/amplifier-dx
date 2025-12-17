# The Certainties

These are the things you can absolutely rely on. Not implementation details that might change - these are **contracts**. Build your systems on them.

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
│  Every tool execution follows this sequence:                │
│                                                             │
│    tool:pre  →  tool execution  →  tool:post                │
│                                                             │
│  No exceptions. No bypasses. No "fast paths" that skip it.  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**What this means for you:**
- You can build comprehensive audit logging
- You can implement approval workflows that cannot be circumvented
- You can create security policies that always apply

**Example:** If you write a hook that blocks `bash` commands containing `rm -rf`, that hook will *always* run before any bash execution. There is no way for the LLM or any other component to skip it.

---

### 2. Events Are Ordered

```
┌─────────────────────────────────────────────────────────────┐
│                   ORDER GUARANTEE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Events fire in deterministic sequence:                     │
│                                                             │
│    session:start                                            │
│    └── prompt:submit                                        │
│        └── provider:request                                 │
│            └── provider:response                            │
│                └── tool:pre                                 │
│                    └── tool:post                            │
│                        └── ... (loop until done)            │
│    └── prompt:complete                                      │
│    session:end                                              │
│                                                             │
│  If A causes B, A's event fires before B's. Always.         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

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
│  Messages accumulate. They are never silently dropped.      │
│                                                             │
│  Your conversation:                                         │
│    [user] → [assistant] → [user] → [assistant] → ...        │
│                                                             │
│  Once a message is in context, it stays until:              │
│    - Explicit compaction (you asked for it)                 │
│    - Session ends                                           │
│                                                             │
│  No "smart" pruning. No invisible summarization.            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**What this means for you:**
- The LLM sees exactly what you think it sees
- History is preserved and inspectable
- If context gets too long, *you* decide what to do about it

---

### 4. Tools Are Isolated

```
┌─────────────────────────────────────────────────────────────┐
│                 ISOLATION GUARANTEE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tools cannot:                                              │
│    ✗ See other tools' internal state                        │
│    ✗ Modify other tools' behavior                           │
│    ✗ Access each other's configuration directly             │
│                                                             │
│  Tools can only:                                            │
│    ✓ Receive input from the orchestrator                    │
│    ✓ Return output to the orchestrator                      │
│    ✓ Emit events that hooks can observe                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**What this means for you:**
- Tools are composable without interference
- Adding a new tool never breaks existing tools
- You can reason about each tool independently

---

### 5. Provider Responses Are Immutable

```
┌─────────────────────────────────────────────────────────────┐
│                IMMUTABILITY GUARANTEE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  What the LLM says, stays said.                             │
│                                                             │
│  When provider:response fires:                              │
│    - The content is final                                   │
│    - It gets recorded as-is in the transcript               │
│    - Nothing modifies it after the fact                     │
│                                                             │
│  Hooks can observe. They cannot alter history.              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**What this means for you:**
- Transcripts are authentic records
- You can trust what's in the event log
- Audit trails are tamper-evident

---

### 6. Configuration Hierarchy Is Deterministic

```
┌─────────────────────────────────────────────────────────────┐
│                 CONFIG GUARANTEE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Configuration merges in this exact order:                  │
│                                                             │
│    defaults                                                 │
│       ↓ overridden by                                       │
│    ~/.amplifier/settings.yaml         (user)                │
│       ↓ overridden by                                       │
│    .amplifier/settings.yaml           (project)             │
│       ↓ overridden by                                       │
│    .amplifier/settings.local.yaml     (local/gitignored)    │
│       ↓ overridden by                                       │
│    function arguments                 (runtime)             │
│                                                             │
│  More specific always wins. No exceptions.                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

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
│  Only hooks can return {action: "deny"}                     │
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
| **Specific event names** | We may add more granular events | Listen for event patterns, not exact strings |
| **Response format details** | LLM outputs evolve | Parse defensively, handle unknowns gracefully |
| **Tool execution order** | When multiple tools are called, order may vary | Don't rely on tool A running before tool B |
| **Timing** | Performance varies by load, model, network | Never depend on specific latencies |
| **Default module versions** | Defaults improve over time | Pin versions in production profiles |
| **Internal data structures** | Implementation details change | Use the public APIs, not internal inspection |

---

## Testing the Guarantees

You don't have to take our word for it. Here's how to verify:

### Verify Hooks Always Fire

```bash
# Create a hook that logs everything
amplifier run --hooks hooks-logging "Do something with files"

# Check the event log - every tool call has tool:pre and tool:post
cat ~/.amplifier/projects/*/sessions/*/events.jsonl | grep "tool:"
```

### Verify Event Ordering

```bash
# Run with debug to see event timestamps
AMPLIFIER_DEBUG=1 amplifier run "List files and count them"

# Timestamps are monotonically increasing for causal chains
```

### Verify Config Hierarchy

```bash
# Set different values at each level and check which wins
echo "model: gpt-4" >> ~/.amplifier/settings.yaml
echo "model: claude-sonnet" >> .amplifier/settings.yaml
amplifier config show model  # Shows claude-sonnet (project wins)
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
