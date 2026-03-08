# Ecosystem Quick Map

Three repos run everything. Here's what each one does, how they depend on each other, and where to look when something breaks.

---

## The Three Repos

```
                    amplifier-app-cli
                  (reference CLI app)
                   /              \
                  v                v
     amplifier-foundation    amplifier-core
     (bundle primitives,     (kernel, contracts,
      shared utilities)       session lifecycle)
                                   |
                                   v
                             [ALL MODULES]
                                   ^
                                   |
            (modules import core, never foundation)
```

**Dependency direction matters.** Arrows point from consumer to dependency. Nothing below points up.

---

## What Each Repo Owns

### amplifier-core — The Kernel

```
  Role:       Mechanism — HOW things coordinate
  Stability:  Highest. Changes here ripple everywhere.
  Depends on: Nothing in the Amplifier ecosystem
```

| Owns | Example |
|------|---------|
| Session lifecycle | `AmplifierSession.execute()` |
| Module coordination | `ModuleCoordinator.mount()`, `.get()` |
| Hook dispatch | `HookRegistry.emit()`, `.register()` |
| Capability registry | `coordinator.register_capability()` |
| Module contracts | `Tool`, `Hook`, `Provider`, `Context`, `Orchestrator` interfaces |
| Config validation | Mount plan structure enforcement |

**The rule:** If it's about coordinating modules or defining contracts, it lives here.

**Does NOT own:** Where modules come from, what modules to load, how to display things, where settings persist.

---

### amplifier-foundation — The Factory

```
  Role:       Bundle primitives and shared utilities
  Stability:  Medium. Changes affect apps that use foundation.
  Depends on: amplifier-core
```

| Owns | Example |
|------|---------|
| Bundle parsing | `load_bundle("./bundles/base.md")` |
| Bundle composition | `base.compose(provider_config)` |
| Module resolution | Download, cache, and locate modules |
| Configuration merging | Three-tier YAML merge (user > project > local) |
| Session factory | `prepared.create_session()` returns Core's `AmplifierSession` |

**The rule:** Foundation configures Core **once during startup**, then your app calls Core directly at runtime. It's a factory, not a proxy.

**Does NOT own:** UX, transport, CLI commands, display logic.

---

### amplifier-app-cli — The Reference App

```
  Role:       Policy — WHAT to do, how to present it
  Stability:  Lowest. Changes here affect end users only.
  Depends on: amplifier-foundation, amplifier-core
```

| Owns | Example |
|------|---------|
| UX systems | Approval prompts, display rendering |
| Transport | Console I/O, terminal UI |
| Module resolution policy | Where to find modules for this app |
| Bundle loading | Which bundles ship with the CLI |
| @mention processing | What `@file` means in this app |
| Capability registration | Injecting `broadcast`, `approval` into sessions |
| Settings persistence | `~/.amplifier/settings.yaml` location decisions |

**The rule:** If it touches the user or the filesystem, it belongs here (or in your custom app).

---

## What Changes Belong Where

Use this table when you're about to write code and aren't sure which repo to open.

| I want to... | Change this repo | Why |
|--------------|------------------|-----|
| Add a new module interface (e.g., new component type) | **amplifier-core** | Contracts are kernel |
| Change how hooks dispatch | **amplifier-core** | Mechanism is kernel |
| Change how bundles compose or inherit | **amplifier-foundation** | Bundle primitives are foundation |
| Change how modules are downloaded/cached | **amplifier-foundation** | Module resolution is foundation |
| Change what the CLI displays | **amplifier-app-cli** | UX is app-layer |
| Add a new CLI command | **amplifier-app-cli** | Commands are app-layer |
| Change where settings are stored | **amplifier-app-cli** | Persistence is app-layer |
| Write a new tool, hook, or provider | **A new module repo** | Capabilities are modules |
| Fix a module bug | **That module's repo** | Modules are isolated |
| Create a bundle for your team | **Your own bundle repo** | Bundles compose on top, not into |

### The Boundary Test

Three questions to find the right repo:

1. **"Does this need to know about the user interface?"**
   Yes → **amplifier-app-cli** (or your app)

2. **"Is this about HOW things coordinate, or WHAT to coordinate?"**
   HOW → **amplifier-core**. WHAT → **amplifier-app-cli** or **amplifier-foundation**.

3. **"Could another app use this unchanged?"**
   Yes → it's a **module** (depends only on core). No → it's **app-layer**.

---

## Push and Test Order

Changes flow in dependency order. Always.

```
  1. amplifier-core        ← push first, test first
  2. amplifier-foundation  ← push second, test against new core
  3. amplifier-app-cli     ← push last, test against new foundation + core
  4. modules               ← independent; push whenever, test against core
```

| If You Changed... | Test By... | Push Order |
|--------------------|------------|------------|
| Core contracts | Shadow env with ALL dependent modules | Core first, then modules |
| Core internals only | Unit tests + shadow with sample modules | Core only |
| Foundation | Direct tests + app integration test | Foundation, then app |
| A module | Module unit tests | Module only (isolated) |
| A bundle | Load bundle, verify composition | Bundle only |
| App CLI | Integration tests | After all dependencies |

---

## Troubleshooting: "Amplifier Isn't Working"

When something breaks, inspect **bottom-up**. Start at the layer closest to the problem, then work down toward the kernel only if needed.

### Step 1: Is it a config/bundle problem? (Most common)

```
Check first — this is where 80% of issues live.

  Symptoms:
    - "Module not found"
    - "No provider configured"
    - Wrong model, wrong tools loaded
    - Bundle doesn't inherit as expected

  Inspect:
    .amplifier/settings.yaml          (project config)
    ~/.amplifier/settings.yaml        (user config)
    Your bundle file (YAML frontmatter)

  Remember the hierarchy:
    defaults < user < project < local < runtime
    More specific always wins.

  Quick fix:
    amplifier config show              (see resolved config)
    AMPLIFIER_DEBUG=1 amplifier run    (see what's loading)
```

### Step 2: Is it a module problem?

```
Check second — a module is failing during execution.

  Symptoms:
    - Tool returns errors
    - Provider returns unexpected responses
    - Hook blocks something it shouldn't (or doesn't block)
    - "Module failed to mount"

  Inspect:
    Event log for the session:
      ~/.amplifier/projects/*/sessions/*/events.jsonl

    Look for:
      tool:pre / tool:post   — did the tool run? was it blocked?
      provider:request       — what was sent to the LLM?
      provider:response      — what came back?

  Key insight:
    Modules depend ONLY on amplifier-core.
    If a module works in one app but not another,
    the problem is app-layer config, not the module.
```

### Step 3: Is it a foundation problem?

```
Check third — session setup failed.

  Symptoms:
    - Session won't create
    - Bundle composition produces wrong result
    - Module download/cache fails
    - "prepare() failed"

  Inspect:
    Foundation is the factory. If the session never starts,
    the factory broke.

    Run with debug:
      AMPLIFIER_DEBUG=1 amplifier run "test"

    Look for:
      - Bundle parsing errors
      - Module resolution failures
      - Composition merge conflicts
```

### Step 4: Is it a core problem? (Rare)

```
Check last — the kernel itself is misbehaving.

  Symptoms:
    - Hooks don't fire (violates the Hook Guarantee)
    - Events arrive out of order (violates the Order Guarantee)
    - Session lifecycle methods fail
    - Orchestrator loop doesn't terminate

  These are rare. Core is the most tested layer.

  If you suspect a core bug:
    1. Reproduce with minimal bundle (one tool, one provider)
    2. Check event log for ordering violations
    3. File against amplifier-core with event log attached
```

### Quick Reference: Symptom → Layer

| Symptom | Likely Layer | First Action |
|---------|-------------|--------------|
| Wrong model / wrong tools | Config/Bundle | Check bundle YAML and settings cascade |
| "Module not found" | Foundation | Check module name, source, network |
| Tool error during execution | Module | Check event log (`tool:pre` / `tool:post`) |
| Hook not blocking/allowing | Module (hook) | Check hook config in bundle |
| Session won't start | Foundation | Run with `AMPLIFIER_DEBUG=1` |
| Provider returns garbage | Module (provider) | Check `provider:request` in event log |
| Events out of order | Core (rare) | Reproduce minimal, file bug |
| Orchestrator infinite loop | Core (rare) | Check tool results in event log |
| Display/UI glitch | App (CLI) | Not a core/foundation issue |

---

## The Import Rule

One rule governs the entire ecosystem. Violations cause fragile systems.

```
  Apps       import  Foundation and Core       ✓
  Foundation imports  Core                     ✓
  Modules    import  Core                     ✓

  Modules    import  Foundation                ✗  NEVER
  Modules    import  App code                  ✗  NEVER
  Core       imports  anything above it        ✗  NEVER
```

If a module needs something from foundation or an app, it should use Core's **capability registry** instead:

```python
# WRONG — module imports app code
from amplifier_app_cli.display import console

# RIGHT — module uses capability from core's registry
broadcast = coordinator.get_capability("broadcast")
if broadcast:
    await broadcast(event, data)
```

---

**Previous:** [Architecture Boundaries](./08-architecture-boundaries.md)
**Next:** End of current documentation. Return to [Index](./00-index.md).