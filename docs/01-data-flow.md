# How Data Flows Through Amplifier

Understanding data flow is the fastest way to understand any system. This page traces exactly what happens to your prompt from the moment you hit enter to the moment you see a response.

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

Every Amplifier session has exactly five types of components. No more, no less.

| Component | Role | Analogy |
|-----------|------|---------|
| **Provider** | Talks to the LLM | The brain |
| **Tools** | Executes actions | The hands |
| **Context** | Remembers history | The memory |
| **Orchestrator** | Controls the loop | The conductor |
| **Hooks** | Observes everything | The security cameras |

## Step-by-Step: What Happens When You Run a Prompt

Let's trace `amplifier run "List Python files"` through the entire system.

### Step 1: Session Creation

```
┌─────────────────────────────────────────────────┐
│ 1. CONFIGURATION RESOLVED                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Profile: "default"                             │
│     ↓                                           │
│  Config merged:                                 │
│     local > project > user                      │
│     ↓                                           │
│  Mount Plan created:                            │
│     {                                           │
│       orchestrator: "loop-streaming",           │
│       providers: ["provider-anthropic"],        │
│       tools: ["tool-filesystem", "tool-bash"],  │
│       context: "context-simple",                │
│       hooks: ["hooks-logging"]                  │
│     }                                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

**What's happening:** Your profile (YAML file) gets compiled into a mount plan. This is the DNA of your session - it defines exactly what capabilities are available.

### Step 2: Module Loading

```
┌─────────────────────────────────────────────────┐
│ 2. MODULES LOADED                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ModuleLoader resolves each module:             │
│                                                 │
│  "provider-anthropic"                           │
│     → Python entry point                        │
│     → AnthropicProvider class instantiated      │
│                                                 │
│  "tool-filesystem"                              │
│     → Module cache or local                     │
│     → FilesystemTool class instantiated         │
│                                                 │
│  Each module's mount() function called          │
│  Modules register with Coordinator              │
│                                                 │
│  EVENT: session:start                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

**What's happening:** The loader finds each module (from entry points, cache, or local code), creates instances, and calls their `mount()` function. Modules register themselves with the Coordinator.

### Step 3: Prompt Submitted

```
┌─────────────────────────────────────────────────┐
│ 3. PROMPT ENTERS THE SYSTEM                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  User prompt: "List Python files"               │
│     ↓                                           │
│  EVENT: prompt:submit                           │
│     ↓                                           │
│  Context adds message:                          │
│     {role: "user", content: "List Python..."}   │
│     ↓                                           │
│  Orchestrator.execute() called                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**What's happening:** Your prompt is wrapped in a message object and added to the Context. Then the Orchestrator takes control.

### Step 4: The Orchestrator Loop

This is where the magic happens. The Orchestrator runs a loop until it has a final answer.

```
┌─────────────────────────────────────────────────┐
│ 4. ORCHESTRATOR LOOP (may repeat)               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ A. Build messages from Context          │   │
│  │    [system, user, assistant, user...]   │   │
│  └──────────────────┬──────────────────────┘   │
│                     ▼                           │
│  ┌─────────────────────────────────────────┐   │
│  │ B. Call Provider.complete(messages)     │   │
│  │    EVENT: provider:request              │   │
│  │                                         │   │
│  │    → HTTP to Anthropic API              │   │
│  │    → Streaming response received        │   │
│  │                                         │   │
│  │    EVENT: provider:response             │   │
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

### Step 5: Tool Execution Detail

Let's zoom in on what happens when a tool is called:

```
┌─────────────────────────────────────────────────┐
│ TOOL EXECUTION: tool-filesystem.list_files     │
├─────────────────────────────────────────────────┤
│                                                 │
│  LLM requested:                                 │
│    {tool: "list_files", input: {pattern:"*.py"}}│
│                                                 │
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
│  │ Hooks receive result:               │       │
│  │   - Can log output                  │       │
│  │   - Can redact sensitive data       │       │
│  │   - Can modify result               │       │
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
│  EVENT: prompt:complete                         │
│     ↓                                           │
│  Context adds assistant message                 │
│     ↓                                           │
│  Response returned to caller                    │
│     ↓                                           │
│  EVENT: session:end (if session closes)         │
│     ↓                                           │
│  Transcript persisted to disk                   │
│                                                 │
│  Output: "Found 12 Python files: main.py,       │
│           utils.py, config.py..."               │
│                                                 │
└─────────────────────────────────────────────────┘
```

## The Event Stream

Every step emits events. Here's a complete trace:

```
14:32:01.001  session:start     {session_id: "abc123", profile: "default"}
14:32:01.002  prompt:submit     {content: "List Python files"}
14:32:01.003  provider:request  {model: "claude-sonnet-4", messages: 1}
14:32:01.523  provider:response {tokens: 45, has_tool_calls: true}
14:32:01.524  tool:pre          {tool: "list_files", input: {pattern: "*.py"}}
14:32:01.589  tool:post         {tool: "list_files", output: "12 files found"}
14:32:01.590  provider:request  {model: "claude-sonnet-4", messages: 3}
14:32:02.103  provider:response {tokens: 89, has_tool_calls: false}
14:32:02.104  prompt:complete   {duration: 1102ms, tool_calls: 1}
14:32:02.105  session:end       {session_id: "abc123"}
```

**Why this matters:** You can observe, debug, and audit everything. No black boxes.

## Data Flow Rules

These rules are **guaranteed** - you can build systems that depend on them:

| Rule | Guarantee |
|------|-----------|
| **Events are ordered** | Events fire in deterministic sequence |
| **Hooks see everything** | No tool execution bypasses hooks |
| **Context is append-only** | Messages accumulate (until explicit compaction) |
| **Tools are isolated** | Tools cannot see other tools' state |
| **Provider responses are immutable** | What the LLM says, stays said |

## Where Data Lives

```
~/.amplifier/
├── settings.yaml              # User-level config
├── profiles/                  # User profiles
│   └── my-profile.md
├── module-cache/              # Downloaded modules
│   └── abc123.../
└── projects/
    └── my-project/
        └── sessions/
            └── session-id/
                ├── transcript.jsonl   # Conversation history
                ├── events.jsonl       # Complete event log
                └── metadata.json      # Session metadata

.amplifier/                    # Project-level (in your repo)
├── settings.yaml              # Project config
├── settings.local.yaml        # Local overrides (gitignored)
└── profiles/                  # Project profiles
    └── team-profile.md
```

## Interactive: Trace Your Own Request

Run this to see the event stream in real-time:

```bash
AMPLIFIER_DEBUG=1 amplifier run "What is 2+2?"
```

Watch for:
- `session:start` - Session initialized
- `prompt:submit` - Your prompt entered
- `provider:request` - LLM API called
- `provider:response` - LLM responded
- `prompt:complete` - Response ready
- `session:end` - Cleanup complete

---

**Next:** [The Certainties →](./02-certainties.md) - What you can absolutely rely on
