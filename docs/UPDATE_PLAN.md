# Amplifier DX Update Plan
## Based on amplifier-simplecli Implementation & Skills Development

**Date**: December 21, 2024
**Context**: After building working amplifier-simplecli + two Agent Skills

---

## Executive Summary

We now have:
1. **✅ amplifier-simplecli** - Working CLI implementation using amplifier-foundation
2. **✅ amplifier-cli-skill** - Agent Skill teaching CLI app building
3. **✅ amplifier-modulebuilder-skill** - Agent Skill teaching module development
4. **✅ Deep understanding** - Traced data flows, confirmed three-layer architecture

The amplifier-dx documentation can now be updated with:
- **Real working examples** from amplifier-simplecli
- **Confirmed architecture** from our implementation
- **Links to our skills** for learning paths
- **Accurate module usage patterns** we validated

---

## Updates Needed by Document

### 1. docs/00-index.md ✅ Mostly Accurate

**Add**:
- Link to amplifier-simplecli as reference implementation
- Link to amplifier-cli-skill and amplifier-modulebuilder-skill
- Add "Learning Resources" section

```markdown
## Learning Resources

### Agent Skills
- **[amplifier-cli-skill](https://github.com/michaeljabbour/amplifier-cli-skill)** - Build CLI applications
- **[amplifier-modulebuilder-skill](https://github.com/michaeljabbour/amplifier-modulebuilder-skill)** - Build modules

### Reference Implementations
- **[amplifier-simplecli](https://github.com/michaeljabbour/amplifier-simplecli)** - Working CLI with 14 modules

### Reading Path: "I want to see it working"
```
5-Minute Understanding → amplifier-simplecli source → amplifier-cli-skill
```
```

---

### 2. docs/01-data-flow.md ✅ Accurate

**Status**: This document is **99% accurate** based on our implementation!

**Minor updates**:
- Add note: "See working example in [amplifier-simplecli](https://github.com/michaeljabbour/amplifier-simplecli)"
- Update CLI command examples from "amplifier run" to show both:
  - Official pattern: `amplifier run` (aspirational)
  - Working example: `python simple_cli.py` from amplifier-simplecli

**Confirmed accurate**:
- Three-layer architecture (Application → Foundation → Core) ✅
- Session creation flow ✅
- Module loading via mount() ✅
- Orchestrator loop ✅
- Tool execution with hooks ✅
- Event stream ✅

---

### 3. docs/02-certainties.md

**Need to verify** - didn't review this doc yet.

**Action**: Read and verify against our implementation.

---

### 4. docs/03-mental-models.md

**Need to verify** - didn't review this doc yet.

**Action**: Read and verify against our implementation.

---

### 5. docs/04-what-happens-when.md

**Need to verify** - didn't review this doc yet.

**Action**: Read through scenarios and verify they match our implementation.

---

### 6. docs/05-quick-start.md ✅ Mostly Accurate

**Status**: Core concepts correct, needs reference updates

**Updates needed**:

1. **Add working example reference**:
```markdown
## See It Working

The best way to understand Amplifier is to see a working implementation:

- **[amplifier-simplecli](https://github.com/michaeljabbour/amplifier-simplecli)** - Complete CLI with:
  - 14 pre-configured modules
  - Memory system (tool-memory, hooks-memory-capture, context-memory)
  - Terminal UI with Rich
  - Interactive setup

Clone it, run it, read the source.
```

2. **Fix profile example** - Current is accurate! Our base.md matches this:
```yaml
---
version: "1.0"
tools:
  - source: amplifier-foundation
    modules: [tool-filesystem, tool-bash]
---
```

3. **Update CLI commands**:
```markdown
# Official CLI (from amplifier monorepo)
amplifier run --profile my-assistant "Help me"

# Working reference implementation
cd amplifier-simplecli
python simple_cli.py
```

---

### 7. docs/06-layers.md

**Need to review** - This is about progressive understanding layers.

**Action**: Verify the five layers (Use → Configure → Extend → Embed → Understand) match our experience.

---

### 8. docs/07-desktop-case-study.md ⚠️ OUTDATED

**Status**: The Dec 17 review flagged this as outdated.

**We now have**: amplifier-simplecli as a **CLI case study**, not desktop, but shows correct patterns.

**Options**:
1. **Replace** with "amplifier-simplecli Case Study" showing CLI implementation
2. **Update** desktop examples to use correct patterns from our learnings
3. **Add section** "amplifier-simplecli CLI Case Study" as companion

**Recommended**: Add new doc `07b-cli-case-study.md` with amplifier-simplecli breakdown.

---

### 9. docs/08-architecture-boundaries.md

**Status**: Dec 17 review says this is **missing** (P0 priority).

**We now understand this!** From building amplifier-simplecli:

**Three Layers** (confirmed):
1. **Application Layer** (amplifier-simplecli)
   - Terminal UI (Rich)
   - Interactive setup
   - Session spawning
   - Profile loading

2. **Foundation Layer** (amplifier-foundation)
   - `load_bundle()` - Loads bundle YAML/MD
   - `compose()` - Merges bundles
   - `prepare()` - Downloads modules
   - `create_session()` - Returns Core's AmplifierSession

3. **Core Layer** (amplifier-core)
   - `session.execute()` - Orchestrator loop
   - Tool execution
   - Hook dispatch
   - Provider calls

**Action**: Create this doc with our confirmed architecture!

---

### 10. Missing Docs (08-12 mentioned in index)

From index.md:
- `08-asset-model.md` - Profile/Bundle/Recipe/Collection
- `09-module-resolution.md` - How modules load
- `10-transport-contracts.md` - WebSocket/REST schemas
- `11-runtime-ownership.md` - State ownership table
- `12-testing-matrix.md` - Test suites

**Status**: These don't exist yet.

**Our contribution**: We can write:
- `08-asset-model.md` - We understand bundles! (base.md, opus.yaml, etc.)
- `09-module-resolution.md` - We know how Foundation loads modules

---

## New Documents to Create

### 1. docs/08-architecture-boundaries.md (P0)

**Content**:
```markdown
# Architecture Boundaries: The Three Layers

Based on amplifier-simplecli reference implementation.

## The Three Layers

[Diagram showing Application → Foundation → Core]

## What Happens Where

### Application Layer (amplifier-simplecli, your-app)
- Terminal UI
- User interaction
- Profile/bundle loading
- Session management

### Foundation Layer (amplifier-foundation)
- Bundle composition
- Module resolution
- Configuration merging
- Session factory

### Core Layer (amplifier-core)
- Session execution
- Orchestrator loop
- Tool dispatch
- Hook events

## The Flow

```python
# APPLICATION: Load configuration
base = await load_bundle("./assets/bundles/base.md")  # Foundation
provider = await load_bundle("./assets/providers/opus.yaml")  # Foundation
composed = base.compose(provider)  # Foundation

# FOUNDATION: Download modules and create session
prepared = await composed.prepare()  # Foundation downloads modules
session = await prepared.create_session()  # Returns Core's AmplifierSession

# CORE: Execute turns
response = await session.execute(user_input)  # Core orchestrator loop
```

## Why This Matters

**Foundation is a factory, not a proxy.**

Foundation configures Core once during startup, then your application calls Core directly during runtime.

## Reference Implementation

See [amplifier-simplecli](https://github.com/michaeljabbour/amplifier-simplecli) for complete working example.
```

---

### 2. docs/07b-cli-case-study.md (NEW)

**Content**: Detailed breakdown of amplifier-simplecli showing:
- How it loads bundles (base.md + opus.yaml)
- How it uses 14 modules
- How it implements memory system
- How it handles terminal UI
- Code references with line numbers

---

### 3. docs/08-asset-model.md (NEW)

**Content**: Clear definitions based on what we learned:

```markdown
# Asset Model: Bundles, Profiles, and Configuration

## The Four Asset Types

### 1. Bundles (base.md)
YAML frontmatter + Markdown body.

Contains:
- Module references (tools, hooks, providers, contexts, orchestrators)
- System prompts
- Configuration

Example:
```yaml
---
version: "1.0"
tools:
  - source: amplifier-foundation
    modules: [tool-filesystem, tool-bash]
---

You are a helpful assistant.
```

Location: `./assets/bundles/base.md`

### 2. Provider Configs (opus.yaml)
Pure YAML configuration for AI providers.

Example:
```yaml
provider:
  name: anthropic
  config:
    model: claude-opus-4-5-20250514
    max_tokens: 8192
```

Location: `./assets/providers/opus.yaml`

### 3. Profiles
**Deprecated** in favor of bundles. Use bundles instead.

### 4. Collections
**Deprecated**. Use bundles.

## Bundle Composition

```python
base = await load_bundle("./assets/bundles/base.md")
provider = await load_bundle("./assets/providers/opus.yaml")
composed = base.compose(provider)  # Merges configuration
```

Foundation handles resolution, downloading, and mounting.
```

---

## Priority Updates

### P0 (Critical) - Do First

1. ✅ **Create docs/08-architecture-boundaries.md**
   - We confirmed the three layers
   - We understand Foundation is factory not proxy
   - Reference amplifier-simplecli

2. ✅ **Update docs/00-index.md**
   - Add links to our skills
   - Add link to amplifier-simplecli
   - Add "Learning Resources" section

3. ✅ **Update docs/05-quick-start.md**
   - Add "See It Working" section with amplifier-simplecli link
   - Update CLI command examples

### P1 (Important) - Do Soon

4. ✅ **Create docs/07b-cli-case-study.md**
   - Deep dive on amplifier-simplecli implementation
   - Show how all 14 modules work together
   - Trace execution flows

5. ✅ **Create docs/08-asset-model.md**
   - Clear bundle/profile/collection definitions
   - Show working examples from amplifier-simplecli
   - Bundle composition patterns

6. **Update docs/07-desktop-case-study.md**
   - Review against correct patterns
   - Update or mark as outdated

### P2 (Nice to Have) - Do Later

7. **Add mermaid diagrams**
   - Architecture diagrams
   - Flow diagrams
   - Reference our implementations

8. **Create context/MODULE_BUILDER_AGENT.md**
   - Use our amplifier-modulebuilder-skill as source
   - Format for AI agents

---

## Success Criteria

After updates:
- [ ] Developer can clone amplifier-simplecli and understand it
- [ ] Documentation links to working examples
- [ ] Architecture boundaries are clear (three layers)
- [ ] Asset model (bundles, providers) is unambiguous
- [ ] Learning path includes our skills

---

## References

- **amplifier-simplecli**: https://github.com/michaeljabbour/amplifier-simplecli
- **amplifier-cli-skill**: https://github.com/michaeljabbour/amplifier-cli-skill
- **amplifier-modulebuilder-skill**: https://github.com/michaeljabbour/amplifier-modulebuilder-skill
- **amplifier-foundation**: https://github.com/microsoft/amplifier-foundation
- **amplifier-core**: https://github.com/microsoft/amplifier-core

---

## Next Steps

1. Create P0 documents (architecture-boundaries.md, update index)
2. Review existing docs (02, 03, 04, 06) for accuracy
3. Create P1 documents (CLI case study, asset model)
4. Add mermaid diagrams
5. Update MODULE_BUILDER_AGENT.md with our modulebuilder-skill content
