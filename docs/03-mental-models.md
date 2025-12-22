# Mental Models

The right mental model turns complexity into intuition. Here are several ways to think about Amplifier - use whichever clicks for you.

**Validated in practice:** All models below accurately represent the system as confirmed in [amplifier-simplecli](https://github.com/michaeljabbour/amplifier-simplecli).

---

## Model 1: The Orchestra

```
┌─────────────────────────────────────────────────────────────────────┐
│                         THE ORCHESTRA                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                        ┌─────────────┐                              │
│                        │ CONDUCTOR   │ ← Orchestrator               │
│                        │  (decides)  │   Controls flow, keeps time  │
│                        └──────┬──────┘                              │
│                               │                                     │
│       ┌───────────────────────┼───────────────────────┐             │
│       │                       │                       │             │
│  ┌────┴────┐            ┌────┴────┐            ┌────┴────┐         │
│  │ SOLOIST │            │ STRINGS │            │  BRASS  │         │
│  │ (LLM)   │            │ (tools) │            │ (tools) │         │
│  └─────────┘            └─────────┘            └─────────┘         │
│   Provider               Tool A                 Tool B              │
│   The creative           Do specific            Do specific         │
│   voice                  things well            things well         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                         SCORE                                │   │
│  │                       (Context)                              │   │
│  │   What's been played so far - everyone can read it           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌───────────────┐                                                  │
│  │   AUDIENCE    │ ← Hooks                                          │
│  │  (watching)   │   Observe everything, can shout "stop!"          │
│  └───────────────┘                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Use this model when:** You're thinking about coordination and flow.

**Key insight:** The conductor doesn't make the music - the instruments do. But without the conductor, it's just noise.

---

## Model 2: The Kitchen

```
┌─────────────────────────────────────────────────────────────────────┐
│                         THE KITCHEN                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Customer order: "I'd like the salmon"                              │
│                          │                                          │
│                          ▼                                          │
│                   ┌─────────────┐                                   │
│                   │ HEAD CHEF   │ ← Orchestrator                    │
│                   │ (planning)  │   "Grill, prep sauce, plate"      │
│                   └──────┬──────┘                                   │
│                          │                                          │
│         ┌────────────────┼────────────────┐                         │
│         │                │                │                         │
│    ┌────┴────┐     ┌────┴────┐     ┌────┴────┐                     │
│    │  GRILL  │     │  SAUCE  │     │ PLATING │  ← Tools            │
│    │ STATION │     │ STATION │     │ STATION │    Each does one    │
│    └─────────┘     └─────────┘     └─────────┘    thing well       │
│                                                                     │
│    ┌───────────────────────────────────────────────────────────┐   │
│    │                     TICKET RAIL                            │   │
│    │                     (Context)                              │   │
│    │   Order history - what's done, what's pending              │   │
│    └───────────────────────────────────────────────────────────┘   │
│                                                                     │
│    ┌───────────────┐                                                │
│    │ FOOD SAFETY   │ ← Hooks                                        │
│    │ INSPECTOR     │   "Wait - check that temp first"               │
│    └───────────────┘                                                │
│                                                                     │
│    ┌───────────────┐                                                │
│    │   SUPPLIER    │ ← Provider (LLM)                               │
│    │ (creativity)  │   Provides the ingredients (ideas/plans)       │
│    └───────────────┘                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Use this model when:** You're thinking about how work gets broken down and executed.

**Key insight:** The chef coordinates, stations execute, the ticket rail tracks state, and the inspector ensures safety. No station needs to know what other stations are doing.

---

## Model 3: The Airport

```
┌─────────────────────────────────────────────────────────────────────┐
│                         THE AIRPORT                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Your request is a passenger trying to get somewhere.               │
│                                                                     │
│  ┌─────────────┐                                                    │
│  │  PASSENGER  │  Your prompt                                       │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐                                                    │
│  │   CHECK-IN  │  Session creation                                  │
│  │   (start)   │  Profile loaded, modules mounted                   │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐                                                    │
│  │  SECURITY   │  Hooks (tool:pre)                                  │
│  │  SCREENING  │  Every passenger goes through. No exceptions.      │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐                                                    │
│  │ AIR TRAFFIC │  Orchestrator                                      │
│  │  CONTROL    │  Decides which "flights" (tool calls) to run       │
│  └──────┬──────┘                                                    │
│         │                                                           │
│    ┌────┴────┬────────┬────────┐                                    │
│    ▼         ▼        ▼        ▼                                    │
│  ┌───┐    ┌───┐    ┌───┐    ┌───┐                                  │
│  │747│    │737│    │A320│   │...│  Tools (different capabilities)   │
│  └───┘    └───┘    └───┘    └───┘                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    FLIGHT LOG                                │   │
│  │                    (Context)                                 │   │
│  │  Complete record of all flights and passengers               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Use this model when:** You're thinking about security and audit trails.

**Key insight:** Everyone goes through security. The flight log is complete and immutable. Air traffic control coordinates but doesn't fly the planes.

---

## Model 4: The Lego Set

```
┌─────────────────────────────────────────────────────────────────────┐
│                         THE LEGO SET                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Amplifier is a box of compatible bricks.                           │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                     MODULE BOX                              │    │
│  │                                                             │    │
│  │   ▓▓▓▓   Provider bricks (talk to LLMs)                     │    │
│  │   ░░░░   Tool bricks (do actions)                           │    │
│  │   ████   Context bricks (remember things)                   │    │
│  │   ▒▒▒▒   Orchestrator bricks (control flow)                 │    │
│  │   ▓░▓░   Hook bricks (observe/intercept)                    │    │
│  │                                                             │    │
│  │   All bricks have standard connectors (interfaces)          │    │
│  │   Any brick fits with any other brick                       │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Profile = The instruction manual                                   │
│            "Connect these bricks in this order"                     │
│                                                                     │
│  Session = Your built creation                                      │
│            Actually assembled and working                           │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │  Profile A:     ▓▓▓▓─░░░░─████                              │    │
│  │  Profile B:     ▓▓▓▓─░░░░─░░░░─░░░░─████─▒▒▒▒               │    │
│  │  Profile C:     ▓▓▓▓─████                                   │    │
│  │                                                             │    │
│  │  Same brick types, different configurations                 │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Use this model when:** You're thinking about modularity and composition.

**Key insight:** You never modify a brick - you just choose which ones to connect. The standard interfaces mean infinite combinations from a finite set of pieces.

---

## Model 5: The Assembly Line

```
┌─────────────────────────────────────────────────────────────────────┐
│                       THE ASSEMBLY LINE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   INPUT                                                             │
│     │                                                               │
│     ▼                                                               │
│  ───●───────●───────●───────●───────●───────●─── CONVEYOR           │
│     │       │       │       │       │       │    (Context)          │
│     │       │       │       │       │       │                       │
│     ▼       ▼       ▼       ▼       ▼       ▼                       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │THINK│ │TOOL1│ │THINK│ │TOOL2│ │THINK│ │DONE │                   │
│  │ LLM │ │ Bash│ │ LLM │ │File │ │ LLM │ │     │                   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                   │
│                                                                     │
│  Each station adds to the item on the conveyor.                     │
│  Nothing is removed - only added.                                   │
│                                                                     │
│  ┌──────────────────────────────────────────┐                       │
│  │ QUALITY CONTROL                          │ ← Hooks               │
│  │ Inspects at each station                 │                       │
│  │ Can stop the line if something's wrong   │                       │
│  └──────────────────────────────────────────┘                       │
│                                                                     │
│  ┌──────────────────────────────────────────┐                       │
│  │ SHIFT SUPERVISOR                         │ ← Orchestrator        │
│  │ Decides: "Go to next station" or "Done"  │                       │
│  └──────────────────────────────────────────┘                       │
│                                                                     │
│   OUTPUT                                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Use this model when:** You're thinking about sequential processing and accumulation.

**Key insight:** Items on the conveyor accumulate work. Quality control sees everything. The supervisor decides when the product is complete.

---

## Choosing Your Model

| Thinking About... | Best Model |
|-------------------|------------|
| Flow and coordination | Orchestra |
| Breaking down work | Kitchen |
| Security and audit | Airport |
| Composition and config | Lego Set |
| Sequential processing | Assembly Line |

---

## Anti-Models (How NOT to Think About It)

### Not a Pipeline
```
❌  input → step1 → step2 → step3 → output

It's not a fixed sequence. The orchestrator decides dynamically
what happens next based on what the LLM wants to do.
```

### Not a Plugin System
```
❌  Core app + plugins that extend it

Modules aren't "extending" a core app. They're equal citizens
that get composed together. There's no privileged "core".
```

### Not Request/Response
```
❌  Request in → Response out

There's a loop. The LLM might call tools many times before
producing a final response. It's interactive, not transactional.
```

### Not Middleware
```
❌  Request → middleware1 → middleware2 → handler

Hooks don't form a chain that processes data through.
They observe events. Big difference.
```

---

**Previous:** [The Certainties](./02-certainties.md)
**Next:** [What Happens When... →](./04-what-happens-when.md) - Concrete scenarios walked through
