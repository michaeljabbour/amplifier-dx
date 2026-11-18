# How Data Flows Through Amplifier

Understanding data flow is the fastest way to understand any system. This page traces exactly what happens to your prompt from the moment you hit enter to the moment you see a response.

**Verified against:** the flow below was checked against the amplifier-core 2.0.2 source and the installed amplifier-app-cli 2026.09.06.

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           YOUR PROMPT                                    │
│                      "List all Python files"                             │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AMPLIFIER SESSION                                │
│                                                                          │
│    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐        │
│    │   Context    │◄────►│ Orchestrator │◄────►│   Provider   │        │
│    │  (memory)    │      │    (loop)    │      │    (LLM)     │        │
│    └──────────────┘      └──────┬───────┘      └──────────────┘        │
│                                 │                                        │
│                                 ▼                                        │
│                          ┌──────────────┐                               │
│                          │    Tools     │                               │
│                          │  (actions)   │                               │
│                          └──────────────┘                               │
│                                 │                                        │
│                          ┌──────┴───────┐                               │
│                          │    Hooks     │◄── observe, modify, block     │
│                          └──────────────┘                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            RESPONSE                                      │
│                  "Found 12 Python files: ..."                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## The Five Components

Every Amplifier session is built from five documented module types. (The kernel's `ModuleType` also recognises `resolver`, and apps inject an approval system and a display system.)

| Component | Role | Analogy |
|-----------|------|---------|
| **Provider** | Talks to the LLM | The brain |
| **Tools** | Executes actions | The hands |
| **Context** | Remembers history | The memory |
| **Orchestrator** | Controls the loop | The conductor |
| **Hooks** | Observes everything | The security cameras |

## Step-by-Step: What Happens When You Run a Prompt

Let's trace a prompt through the entire system. The flow is identical whether you use:
- Official CLI: `amplifier run "List Python files"` (from amplifier monorepo)
- Your own Python: the scripts in the [amplifier-foundation examples](https://github.com/microsoft/amplifier-foundation/tree/main/examples), starting with `examples/01_hello_world.py`

### Step 1: Session Creation

```
┌─────────────────────────────────────────────────┐
│ 1. CONFIGURATION RESOLVED                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Bundle: "default"                              │
│     ↓                                           │
│  Config merged:                                 │
│     local > project > user                      │
│     ↓                                           │
│  Mount Plan created:                            │
│   {                                             │
│     session: {                                  │
│       orchestrator: "loop-streaming",           │
│       context: "context-simple"                 │
│     },                                          │
│     providers: [{module: "provider-anthropic"}],│
│     tools: [{module: "tool-filesystem"},        │
│             {module: "tool-bash"}],             │
│     hooks: [{module: "hooks-logging"}]          │
│   }                                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**What's happening:** Your bundle (YAML/MD file) gets compiled into a mount plan. This is the DNA of your session - it defines exactly what capabilities are available.

### Step 2: Module Loading

```
┌─────────────────────────────────────────────────┐
│ 2. MODULES LOADED                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ModuleLoader resolves each module ID the       │
│  same way:                                      │
│                                                 │
│     1. the app's module-source resolver,        │
│        if one is mounted                        │
│     2. otherwise the amplifier.modules          │
│        entry point                              │
│     3. otherwise a filesystem search            │
│                                                 │
│     → returns the module's mount() function     │
│                                                 │
│  Each module's mount() function called          │
│  (mount() creates the instance)                 │
│  Modules register with Coordinator              │
│                                                 │
│  Order: orchestrator, context, providers,       │
│  tools, hooks; then each module's optional      │
│  on_session_ready()                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**What's happening:** The loader resolves each module ID the same way: through the app's module-source resolver if one is mounted, otherwise through the `amplifier.modules` entry point, otherwise a filesystem search. It returns the module's `mount()` function; `mount()` creates the instance and registers it with the Coordinator.

### Step 3: Prompt Submitted

```
┌─────────────────────────────────────────────────┐
│ 3. PROMPT ENTERS THE SYSTEM                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  session.execute("List Python files")           │
│     ↓                                           │
│  EVENT: session:start                           │
│     (once, on the first execute() call;         │
│      session:resume for a resumed session)      │
│     ↓                                           │
│  Orchestrator.execute() called                  │
│     ↓                                           │
│  EVENT: execution:start                         │
│     ↓                                           │
│  EVENT: prompt:submit                           │
│     ↓                                           │
│  Context adds message:                          │
│     {role: "user", content: "List Python..."}   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**What's happening:** The session hands your prompt to the Orchestrator, which adds it to the Context and starts the loop. The kernel emits `session:start` and calls the orchestrator directly; the orchestrator emits `execution:start` (required by the orchestrator contract) and `prompt:submit` (as the standard `loop-streaming` orchestrator does).

### Step 4: The Orchestrator Loop

This is where the magic happens. The Orchestrator runs a loop until it has a final answer.

```
┌─────────────────────────────────────────────────┐
│ 4. ORCHESTRATOR LOOP (may repeat)               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ A. context.get_messages_for_request()   │   │
│  │    [system, user, assistant, user...]   │   │
│  │    (the context manager compacts the    │   │
│  │     returned view if needed)            │   │
│  └──────────────────┬──────────────────────┘   │
│                     ▼                           │
│  ┌─────────────────────────────────────────┐   │
│  │ B. Call provider.complete(ChatRequest)  │   │
│  │    EVENT: provider:request              │   │
│  │           (from the orchestrator)       │   │
│  │    EVENT: llm:request (from provider)   │   │
│  │                                         │   │
│  │    → HTTP to Anthropic API              │   │
│  │    → Streaming response received        │   │
│  │                                         │   │
│  │    EVENT: llm:response (from provider)  │   │
│  └──────────────────┬──────────────────────┘   │
│                     ▼                           │
│  ┌─────────────────────────────────────────┐   │
│  │ C. Check response for tool calls        │   │
│  │                                         │   │
│  │    If NO tool calls → Exit loop         │   │
│  │    If tool calls → Continue to D        │   │
│  └──────────────────┬──────────────────────┘   │
│                     ▼                           │
│  ┌─────────────────────────────────────────┐   │
│  │ D. Execute each tool call               │   │
│  │                                         │   │
│  │    EVENT: tool:pre                      │   │
│  │    (hooks can block here)               │   │
│  │                                         │   │
│  │    → tool.execute(input)                │   │
│  │                                         │   │
│  │    EVENT: tool:post                     │   │
│  │                                         │   │
│  │    Results added to Context             │   │
│  └──────────────────┬──────────────────────┘   │
│                     │                           │
│                     └─────► Loop back to A      │
│                                                 │
└─────────────────────────────────────────────────┘
```

**What's happening:** The Orchestrator repeatedly:
1. Gets conversation history from Context
2. Sends it to the Provider (LLM)
3. Checks if the LLM wants to use tools
4. If yes: executes tools, adds results to Context, loops again
5. If no: exits with the final response

**Who emits what:** the orchestrator emits `provider:request`; the provider module emits `llm:request` and `llm:response`, which the kernel correlates with a shared `request_id`. `provider:response` is a canonical event name and the orchestrator contract lists it, but the installed `loop-streaming` orchestrator does not emit it, so don't depend on it.

### Step 5: Tool Execution Detail

Let's zoom in on what happens when a tool is called:

```
┌─────────────────────────────────────────────────┐
│ TOOL EXECUTION: tool-filesystem.list_files     │
├─────────────────────────────────────────────────┤
│                                                 │
│  LLM requested:                                 │
│    {id: "...", name: "list_files",              │
│     arguments: {pattern: "*.py"}}               │
│       │                                         │
│       ▼                                         │
│  ┌─────────────────────────────────────┐       │
│  │ EVENT: tool:pre                     │       │
│  │                                     │       │
│  │ All hooks receive this event:       │       │
│  │   - hooks-logging: logs it          │       │
│  │   - hooks-approval: may ask user    │       │
│  │   - custom hooks: may block/modify  │       │
│  │                                     │       │
│  │ If any hook returns {action:"deny"} │       │
│  │ → Tool execution stops here         │       │
│  └──────────────────┬──────────────────┘       │
│                     ▼                           │
│  ┌─────────────────────────────────────┐       │
│  │ TOOL EXECUTES                       │       │
│  │                                     │       │
│  │ tool.execute({pattern: "*.py"})     │       │
│  │                                     │       │
│  │ → Reads filesystem                  │       │
│  │ → Returns ToolResult                │       │
│  └──────────────────┬──────────────────┘       │
│                     ▼                           │
│  ┌─────────────────────────────────────┐       │
│  │ EVENT: tool:post                    │       │
│  │                                     │       │
│  │ Hooks receive the result:           │       │
│  │   - Can log output                  │       │
│  │   - Can return modified event data  │       │
│  │     or inject context               │       │
│  │   - The orchestrator decides how    │       │
│  │     to apply it                     │       │
│  └──────────────────┬──────────────────┘       │
│                     ▼                           │
│  Result added to Context as tool_result        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Step 6: Response Returned

```
┌─────────────────────────────────────────────────┐
│ 6. FINAL RESPONSE                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  Orchestrator exits loop                        │
│     ↓                                           │
│  Context adds assistant message                 │
│     ↓                                           │
│  EVENT: orchestrator:complete                   │
│     ↓                                           │
│  EVENT: execution:end                           │
│     ↓                                           │
│  Response returned to caller                    │
│                                                 │
│  Output: "Found 12 Python files: main.py,       │
│           utils.py, config.py..."               │
│                                                 │
│  Later, when the app calls session.cleanup():   │
│     EVENT: session:end                          │
│     ↓                                           │
│     Module cleanup callables run                │
│                                                 │
└─────────────────────────────────────────────────┘
```

**What's happening:** `session:end` belongs to the session, not the turn: it fires once, at `session.cleanup()`, before module cleanup callables run. Transcript persistence is done by the app or a hook module, not the kernel.

## The Event Stream

Every step emits events. Here's a complete trace:

```
14:32:01.001  session:start         {session_id, parent_id: null}
14:32:01.002  execution:start       {prompt: "List Python files"}
14:32:01.002  prompt:submit         {prompt: "List Python files"}
14:32:01.003  provider:request      {provider, model, ...}
14:32:01.004  llm:request           {request_id, ...}
14:32:01.523  llm:response          {request_id, ...}
14:32:01.524  tool:pre              {tool_name: "list_files", tool_call_id, tool_input: {pattern: "*.py"}}
14:32:01.589  tool:post             {tool_name: "list_files", tool_input, tool_result}
14:32:01.590  provider:request      {provider, model, ...}
14:32:01.591  llm:request           {request_id, ...}
14:32:02.103  llm:response          {request_id, ...}
14:32:02.104  orchestrator:complete {orchestrator, turn_count, status: "success"}
14:32:02.105  execution:end         {response, status: "completed"}
     ...      session:end           {session_id}          # at session.cleanup()
```

Timestamps are illustrative. Every record also carries `session_id`, `parent_id` and a kernel-stamped `timestamp`. The `llm:*` payloads beyond `request_id` are defined by the provider module, and `tool_call_id` is added by the `loop-streaming` orchestrator.

**Why this matters:** You can observe, debug, and audit everything. No black boxes.

## Data Flow Rules

These rules are **guaranteed** - you can build systems that depend on them. Some are enforced by the kernel; others are contracts that every compliant module must honor:

| Rule | Guarantee |
|------|-----------|
| **Events are ordered** | Handlers for one event run sequentially in priority order. The order of events across a turn is set by the orchestrator |
| **Hooks see everything** | Orchestrators are required to emit `tool:pre` and `tool:post` around every tool call. The kernel dispatches these events; it does not itself intercept tool calls |
| **Context is append-only** | Stored history is preserved: compaction returns a shortened view for the LLM request and must not modify stored messages. The protocol does allow `set_messages()` (resume) and `clear()` |
| **Tools are isolated** | By design rule, tools do not reach into other tools' state (a convention modules follow, not a sandbox) |
| **Provider responses: convention only** | The exception in this table. The kernel gives no immutability guarantee: hooks may return `modify` or `inject_context`, and how a response is recorded is up to the orchestrator and context modules you install (see [The Certainties, section 5](./02-certainties.md)) |

## Where Data Lives

```
~/.amplifier/
├── settings.yaml              # User-level (global) config
├── keys.env                   # API keys (never in settings.yaml)
├── registry.json              # Bundle registry state (derived; regenerates)
├── bundles/                   # User bundles
│   └── my-bundle.md
├── cache/                     # Downloaded bundles and modules
│   └── <repo>-<hash>/
└── projects/
    └── <project-slug>/        # cwd with / replaced by -, e.g. -home-user-repos-myapp
        └── sessions/
            └── <session-id>/
                ├── transcript.jsonl   # Conversation history
                ├── events.jsonl       # Complete event log
                ├── metadata.json      # Session metadata
                └── settings.yaml      # Optional session-scope settings

.amplifier/                    # Project-level (in your repo)
├── settings.yaml              # Project config
├── settings.local.yaml        # Local overrides (gitignored)
└── bundles/                   # Project bundles
    └── team-bundle.md
```

## Interactive: Trace Your Own Request

**Option 1: Watch the events from Python**

The [amplifier-foundation examples](https://github.com/microsoft/amplifier-foundation/tree/main/examples) are runnable scripts. `examples/01_hello_world.py` is the shortest path through this flow, and `examples/13_event_debugging.py` shows how to observe the events with hooks as a session runs.

**Option 2: Trace output with the official CLI**

Run this for the full execution trace, then read the session's event log (there is no debug environment variable; `-v` gives verbose output):

```bash
amplifier run --output-format json-trace "What is 2+2?"

# Every session also writes its events to disk
cat ~/.amplifier/projects/*/sessions/*/events.jsonl
```

Look for:
- `session:start` - First prompt of the session
- `execution:start` - Orchestrator took control
- `prompt:submit` - Your prompt entered
- `provider:request` - LLM call about to be made
- `llm:request` - LLM API called
- `llm:response` - LLM responded
- `orchestrator:complete` - Response ready
- `execution:end` - Orchestrator returned
- `session:end` - Session cleanup started

---

**Next:** [The Certainties →](./02-certainties.md) - What you can absolutely rely on
