# What Happens When...

Learn by example. Here are real scenarios traced through the system, step by step.

**Validated in practice:** All scenarios below match the behavior observed in [amplifier-simplecli](https://github.com/michaeljabbour/amplifier-simplecli), which implements these exact patterns with 14 modules.

---

## Scenario 1: A Simple Question

**You ask:** "What is 2+2?"

```
┌─────────────────────────────────────────────────────────────────────┐
│  WHAT HAPPENS                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. prompt:submit                                                   │
│     └─ Message added to Context: {role: "user", content: "2+2?"}    │
│                                                                     │
│  2. Orchestrator calls Provider                                     │
│     └─ provider:request fired                                       │
│     └─ Messages sent to LLM API                                     │
│                                                                     │
│  3. LLM responds (no tool calls)                                    │
│     └─ provider:response fired                                      │
│     └─ Response: "2+2 equals 4."                                    │
│                                                                     │
│  4. Orchestrator sees no tool calls → exit loop                     │
│     └─ prompt:complete fired                                        │
│                                                                     │
│  5. Response returned                                               │
│     └─ "2+2 equals 4."                                              │
│                                                                     │
│  TOTAL TOOL CALLS: 0                                                │
│  TOTAL LLM CALLS: 1                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight:** Simple questions that don't need tools are fast. One LLM call, done.

---

## Scenario 2: File Operation

**You ask:** "List the Python files in this directory"

```
┌─────────────────────────────────────────────────────────────────────┐
│  WHAT HAPPENS                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. prompt:submit                                                   │
│     └─ Message added to Context                                     │
│                                                                     │
│  2. Orchestrator calls Provider (1st call)                          │
│     └─ provider:request                                             │
│     └─ LLM thinks: "I need to list files"                           │
│     └─ provider:response (with tool_calls)                          │
│        └─ tool_calls: [{name: "list_files", input: {pattern:"*.py"}}] │
│                                                                     │
│  3. Orchestrator executes tool                                      │
│     └─ tool:pre fired (hooks see this)                              │
│        └─ Any hook could block here                                 │
│     └─ tool-filesystem.list_files({pattern: "*.py"})                │
│     └─ Result: ["main.py", "utils.py", "config.py"]                 │
│     └─ tool:post fired (hooks see result)                           │
│                                                                     │
│  4. Result added to Context                                         │
│     └─ {role: "tool", content: "main.py, utils.py, config.py"}      │
│                                                                     │
│  5. Orchestrator calls Provider (2nd call)                          │
│     └─ provider:request (now with tool result in context)           │
│     └─ LLM: "I found the files, let me format the answer"           │
│     └─ provider:response (no tool_calls)                            │
│        └─ "Found 3 Python files: main.py, utils.py, config.py"      │
│                                                                     │
│  6. No more tool calls → exit loop                                  │
│     └─ prompt:complete                                              │
│                                                                     │
│  TOTAL TOOL CALLS: 1                                                │
│  TOTAL LLM CALLS: 2                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight:** Tool usage creates a loop. LLM requests tool → tool runs → result goes back to LLM → LLM synthesizes answer.

---

## Scenario 3: Multi-Tool Task

**You ask:** "Read config.py and tell me what environment variables it uses"

```
┌─────────────────────────────────────────────────────────────────────┐
│  WHAT HAPPENS                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. prompt:submit                                                   │
│                                                                     │
│  2. Provider call #1                                                │
│     └─ LLM thinks: "I need to read the file first"                  │
│     └─ tool_calls: [{name: "read_file", input: {path: "config.py"}}]│
│                                                                     │
│  3. Tool: read_file                                                 │
│     └─ tool:pre → (hooks approve)                                   │
│     └─ Execute → Returns file contents                              │
│     └─ tool:post → (hooks log result)                               │
│                                                                     │
│  4. Provider call #2                                                │
│     └─ LLM analyzes file contents                                   │
│     └─ LLM thinks: "I see os.getenv() calls, let me grep for more"  │
│     └─ tool_calls: [{name: "bash", input: {command: "grep -n 'getenv' config.py"}}] │
│                                                                     │
│  5. Tool: bash                                                      │
│     └─ tool:pre → (hooks check command safety)                      │
│     └─ Execute → Returns grep output                                │
│     └─ tool:post                                                    │
│                                                                     │
│  6. Provider call #3                                                │
│     └─ LLM synthesizes answer with all information                  │
│     └─ No tool_calls → exit loop                                    │
│     └─ "config.py uses these environment variables:                 │
│         - DATABASE_URL (line 12)                                    │
│         - API_KEY (line 15)                                         │
│         - DEBUG (line 18)"                                          │
│                                                                     │
│  TOTAL TOOL CALLS: 2                                                │
│  TOTAL LLM CALLS: 3                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight:** The LLM decides what tools to use. It might call multiple tools, in whatever order makes sense to it.

---

## Scenario 4: Hook Blocking

**You ask:** "Delete all files in /tmp"

```
┌─────────────────────────────────────────────────────────────────────┐
│  WHAT HAPPENS (with a safety hook)                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. prompt:submit                                                   │
│                                                                     │
│  2. Provider call #1                                                │
│     └─ LLM: "I'll use bash to delete files"                         │
│     └─ tool_calls: [{name: "bash", input: {command: "rm -rf /tmp/*"}}] │
│                                                                     │
│  3. Tool execution BLOCKED                                          │
│     └─ tool:pre fired                                               │
│     └─ hooks-safety sees "rm -rf" pattern                           │
│     └─ Hook returns: {action: "deny", reason: "Dangerous command"}  │
│     └─ Tool DOES NOT EXECUTE                                        │
│     └─ Result sent to LLM: "Tool blocked: Dangerous command"        │
│                                                                     │
│  4. Provider call #2                                                │
│     └─ LLM sees tool was blocked                                    │
│     └─ LLM: "I can't execute that command due to safety policy"     │
│     └─ No tool_calls → exit loop                                    │
│                                                                     │
│  TOTAL TOOL CALLS: 0 (blocked before execution)                     │
│  TOTAL LLM CALLS: 2                                                 │
│                                                                     │
│  ⚠️  THE COMMAND NEVER RAN                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight:** Hooks intercept *before* execution. The dangerous command never runs. The LLM is informed and adapts.

---

## Scenario 5: Streaming Response

**You ask:** "Write a poem about coding"

```
┌─────────────────────────────────────────────────────────────────────┐
│  WHAT HAPPENS (streaming)                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. prompt:submit                                                   │
│                                                                     │
│  2. Provider call with streaming                                    │
│     └─ provider:request                                             │
│     └─ Connection opened to LLM API                                 │
│                                                                     │
│  3. Tokens stream in                                                │
│     └─ delta: "In"                                                  │
│     └─ delta: " the"                                                │
│     └─ delta: " quiet"                                              │
│     └─ delta: " hours"                                              │
│     └─ delta: " of"                                                 │
│     └─ delta: " night"                                              │
│     └─ delta: ","                                                   │
│     └─ ... (continues)                                              │
│                                                                     │
│  4. Each delta immediately sent to client                           │
│     └─ UI updates in real-time                                      │
│     └─ User sees text appearing                                     │
│                                                                     │
│  5. Stream completes                                                │
│     └─ provider:response (full message assembled)                   │
│     └─ No tool_calls → exit loop                                    │
│     └─ prompt:complete                                              │
│                                                                     │
│  USER EXPERIENCE: Text appears word by word                         │
│  LATENCY TO FIRST TOKEN: ~200-500ms                                 │
│  TOTAL TIME: ~3-5 seconds                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight:** Streaming means the user sees output immediately, even before the LLM is done thinking.

---

## Scenario 6: Profile Inheritance

**You run:** `amplifier run --profile team-coding "Fix the bug in auth.py"`

```
┌─────────────────────────────────────────────────────────────────────┐
│  WHAT HAPPENS (profile resolution)                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Profile "team-coding" requested                                 │
│                                                                     │
│  2. Profile chain resolved                                          │
│     └─ Load team-coding.md                                          │
│     └─ See: extends: "coding-base"                                  │
│     └─ Load coding-base.md                                          │
│     └─ See: extends: "default"                                      │
│     └─ Load default.md                                              │
│                                                                     │
│  3. Profiles merged (child overrides parent)                        │
│     └─ default       → base provider, basic tools                   │
│     └─ + coding-base → adds code tools, system prompt for coding    │
│     └─ + team-coding → adds team hooks, specific model              │
│                                                                     │
│  4. Final mount plan                                                │
│     {                                                               │
│       provider: "provider-anthropic" (from team-coding),            │
│       model: "claude-opus-4-5-20251101" (from team-coding),                     │
│       tools: [                                                      │
│         "tool-filesystem",   (from coding-base)                     │
│         "tool-bash",         (from coding-base)                     │
│         "tool-grep",         (from coding-base)                     │
│         "tool-code-review"   (from team-coding)                     │
│       ],                                                            │
│       hooks: [                                                      │
│         "hooks-logging",     (from default)                         │
│         "hooks-team-audit"   (from team-coding)                     │
│       ],                                                            │
│       system_prompt: "You are a senior developer..." (merged)       │
│     }                                                               │
│                                                                     │
│  5. Session created with merged configuration                       │
│     └─ All modules loaded and mounted                               │
│     └─ Ready to process prompt                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight:** Inheritance lets you layer configurations. Teams can share a base while customizing their own needs.

---

## Scenario 7: Error Recovery

**You ask:** "Run tests" (but tests fail)

```
┌─────────────────────────────────────────────────────────────────────┐
│  WHAT HAPPENS (error case)                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. prompt:submit                                                   │
│                                                                     │
│  2. Provider call #1                                                │
│     └─ tool_calls: [{name: "bash", input: {command: "npm test"}}]   │
│                                                                     │
│  3. Tool: bash                                                      │
│     └─ tool:pre → approved                                          │
│     └─ Execute → npm test runs                                      │
│     └─ Exit code: 1 (failure)                                       │
│     └─ Output: "3 tests failed..."                                  │
│     └─ tool:post → result includes error info                       │
│                                                                     │
│  4. Error result added to Context                                   │
│     └─ {role: "tool", content: "Exit code 1: 3 tests failed..."}    │
│                                                                     │
│  5. Provider call #2                                                │
│     └─ LLM sees the failure                                         │
│     └─ LLM decides what to do:                                      │
│        - Report the error?                                          │
│        - Try to fix the tests?                                      │
│        - Ask for clarification?                                     │
│     └─ (depends on LLM judgment and system prompt)                  │
│                                                                     │
│  NOTE: The tool returned an error, but didn't "fail"                │
│  The error is just data that the LLM can act on.                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight:** Tool errors don't crash the system. They're information for the LLM to handle.

---

## Scenario 8: Session Persistence

**You close the app and reopen it**

```
┌─────────────────────────────────────────────────────────────────────┐
│  WHAT HAPPENS (session recovery)                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ON CLOSE:                                                          │
│  1. session:end event fires                                         │
│  2. Transcript saved to disk                                        │
│     └─ ~/.amplifier/projects/xyz/sessions/abc/transcript.jsonl      │
│  3. Events saved                                                    │
│     └─ ~/.amplifier/projects/xyz/sessions/abc/events.jsonl          │
│  4. Metadata saved                                                  │
│     └─ ~/.amplifier/projects/xyz/sessions/abc/metadata.json         │
│                                                                     │
│  ON REOPEN:                                                         │
│  1. App loads session list                                          │
│     └─ Scans ~/.amplifier/projects/*/sessions/                      │
│  2. User selects previous session                                   │
│  3. Session restored                                                │
│     └─ Load transcript.jsonl into Context                           │
│     └─ Recreate message history                                     │
│  4. New session:start event                                         │
│     └─ Fresh session ID                                             │
│     └─ But with existing context loaded                             │
│  5. Ready to continue conversation                                  │
│                                                                     │
│  PRESERVED: All messages, tool results, context                     │
│  NOT PRESERVED: Running tool state (if any)                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight:** Context persists between sessions. You can close the app, reopen, and continue where you left off.

---

## Quick Reference: Event Counts by Scenario

| Scenario | LLM Calls | Tool Calls | Hook Events |
|----------|-----------|------------|-------------|
| Simple question | 1 | 0 | 0 |
| Single tool use | 2 | 1 | 2 (pre+post) |
| Multi-tool task | 3+ | 2+ | 2 per tool |
| Blocked command | 2 | 0 | 1 (pre only) |
| Streaming output | 1 | 0 | 0 |

---

**Previous:** [Mental Models](./03-mental-models.md)
**Next:** [5-Minute Understanding →](./05-quick-start.md) - Get up to speed fast
