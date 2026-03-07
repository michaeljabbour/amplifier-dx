# Working with AI

A practical comparison of vibe coding and structured AI-assisted development.

---

## Two Approaches

When building with AI assistance, you have two fundamentally different workflows. Neither is "correct" — they solve different problems.

### Vibe Coding

**What it is:** Conversational, iterative development. You describe what you want, the AI proposes changes, you refine through dialogue.

**How it works:**
```
"Add a login form" 
  → AI writes code 
    → "Make it look better" 
      → AI adjusts styling 
        → "Add validation" 
          → AI adds checks
```

**Strengths:**
- Fast exploration when you're not sure what you want
- Great for prototyping and experimentation
- Works well for small, isolated changes
- Low cognitive overhead — no upfront planning required

**Best for:**
- Discovery work (figuring out what to build)
- Quick fixes and adjustments
- Learning new APIs or frameworks
- One-off scripts and utilities

### Structured AI-Assisted Development

**What it is:** Specification-first development. You define the contract, architecture, and success criteria before implementation begins.

**How it works:**
```
Write spec → Review spec → Implement from spec → Verify against spec
```

**Strengths:**
- Predictable outcomes at scale
- Clear separation of design and implementation
- Easy to verify correctness (does it match the spec?)
- Multiple people can work from the same spec

**Best for:**
- Production systems with clear requirements
- Coordinating work across multiple files/modules
- Maintaining consistency across a codebase
- Code that needs to be verified, reviewed, or audited

---

## When to Use Which

| Scenario | Vibe Coding | Structured |
|----------|-------------|------------|
| Exploring a new API | ✅ Fast feedback loop | ❌ Too much overhead |
| Building a production feature | ⚠️ Risk of scope creep | ✅ Clear contract |
| Quick bug fix (1-2 lines) | ✅ Minimal ceremony | ❌ Specification overkill |
| Multi-file refactoring | ❌ Easy to lose coherence | ✅ Coordinated changes |
| Learning a new pattern | ✅ Interactive teaching | ⚠️ Spec assumes knowledge |
| Integration with existing system | ⚠️ May break contracts | ✅ Explicit interfaces |
| Prototyping an idea | ✅ Rapid iteration | ❌ Premature formalization |
| Maintaining a module boundary | ❌ Boundary drift | ✅ Contract enforcement |

**Legend:**
- ✅ Good fit
- ⚠️ Use with caution
- ❌ Poor fit

---

## Structured Patterns in Amplifier

Amplifier's architecture supports structured development through clear separation of concerns. Here's the typical workflow:

### 5-Step Workflow

**1. Specification (Design Phase)**

Write the contract before touching code:

```markdown
## Module: Cache Service

**Contract:** Store and retrieve objects with TTL support

**Public Interface:**
- get(key: str) -> Optional[Any]
- set(key: str, value: Any, ttl: int = 3600) -> None
- clear() -> None

**Dependencies:** Redis client
**Error Handling:** Return None on cache miss, log errors but don't raise
```

The specification is the source of truth. Implementation details can vary, but the contract is fixed.

**2. Architecture Review**

Before implementing, verify:
- Does this belong in app layer, kernel layer, or module layer?
- What are the boundaries? (See [Architecture Boundaries](./08-architecture-boundaries.md))
- Are there existing contracts this must follow?

This step catches architectural problems before they become code.

**3. Implementation**

With the spec complete, implementation becomes mechanical:
```python
# Implement exactly what the spec says
# No interpretation required
# Contract is the source of truth
```

The goal is to make implementation boring. All the interesting decisions happened in steps 1 and 2.

**4. Contract Validation**

Write tests that verify the contract, not the implementation:
```python
def test_cache_contract():
    """Cache must store and retrieve values."""
    cache.set("key", "value")
    assert cache.get("key") == "value"

def test_cache_ttl():
    """Cache must expire after TTL."""
    cache.set("key", "value", ttl=1)
    time.sleep(2)
    assert cache.get("key") is None
```

These tests verify the specification, not the implementation.

**5. Integration Verification**

Verify the module works within the broader system:
- Does it respect boundaries?
- Are hooks firing correctly?
- Does it handle session lifecycle events?

---

## Mixing Approaches

The most effective workflow uses **both approaches at different stages**.

### Discovery Phase: Vibe Coding

```
You: "I need to cache LLM responses to avoid repeat API calls"
AI:  "Here's a simple in-memory cache with TTL..."
You: "What if I want persistence across sessions?"
AI:  "We could use Redis. Let me show you..."
You: "Actually, let's support both backends"
```

**At this stage:**
- Rapid iteration is valuable
- Requirements are emerging
- Trying different approaches is cheap
- Code is throwaway/prototype quality

Don't worry about production quality. The goal is to find the right design, not build the right implementation.

### Transition: Crystallize the Design

Once you know what you want to build, stop coding and write the spec:

```markdown
## Module: Cache Service

**Purpose:** Prevent redundant LLM API calls

**Requirements:**
1. In-memory backend (default, no setup)
2. Redis backend (optional, configured via env var)
3. Automatic TTL (default 1 hour)
4. Key serialization (handle complex objects)

**Public Interface:** [define exactly...]
```

This is the moment where exploration becomes engineering.

### Delivery Phase: Structured Implementation

Now execute the spec with clear acceptance criteria:
- Tests written first (TDD)
- Implementation follows contract exactly
- Verification confirms it matches the spec

### When to Transition

Move from discovery to structure when:
- You can clearly articulate the requirements
- The design has stabilized (no major changes in last 2-3 iterations)
- You're ready to write production-quality code
- Other people need to understand or extend this code

---

## Common Pitfalls

### Antipattern 1: Vibe-Coding Production Features

**Problem:** Using conversational iteration for complex features that need coordination across multiple files.

**Symptoms:**
- "Just one more adjustment" cycles that never end
- Inconsistent naming across files
- Breaking changes to existing code
- Unclear what "done" means

**Why it happens:**
Vibe coding feels faster because you skip the planning step. But without a target, you never know when to stop.

**Fix:**
Stop coding. Write a 1-page spec:
- What are the public interfaces?
- What are the dependencies?
- What defines success?

Then implement from the spec.

**Real example:**
```
❌ "Add auth" → session storage → cookies → JWT → refresh tokens → [never stops]
✅ Write auth spec → implement OAuth2 flow → verify against spec → done
```

### Antipattern 2: Over-Specifying Discovery Work

**Problem:** Writing detailed specifications before you know what you're building.

**Symptoms:**
- Spec keeps changing during implementation
- "We need to revise the spec" every hour
- Analysis paralysis — never starting implementation
- Specifications for throwaway code

**Why it happens:**
Structure feels "professional," so teams default to it even during exploration. But structure only helps when you know what you're building.

**Fix:**
Use vibe coding to explore first. Write the spec only when:
- You've prototyped enough to know what works
- Requirements are stable enough to formalize
- You're ready to build the "real" version

**Real example:**
```
❌ 20-page caching spec → prototype reveals wrong approach → rewrite spec
✅ Vibe-code 3 cache prototypes → learn what works → write 1-page spec → build
```

### Antipattern 3: Mixing Contexts in One Session

**Problem:** Switching between discovery and delivery modes within the same conversation.

**Symptoms:**
- AI produces half-specified, half-vibe-coded results
- Unclear whether code is prototype or production
- Tests written after implementation (or not at all)
- Difficulty tracking what's been agreed to

**Why it happens:**
Natural conversations jump between exploration and execution. But code needs clarity about which mode you're in.

**Fix:**
Separate concerns:
```
Session 1 (Discovery): Vibe-code until you find the design
Session 2 (Specification): Write the contract document
Session 3 (Implementation): Build from spec with TDD
```

Make the transitions explicit. When you switch from discovery to structure, say so clearly.

**Real example:**
```
❌ One session: explore caching, write spec, implement, test, fix bugs...
✅ Three sessions: explore (1hr) → spec (30min) → implement with TDD (2hr)
```

---

## Amplifier's Opinion

Amplifier's architecture **assumes structured development for the kernel and modules**, but is **neutral about application code**.

**Why structured for kernel/modules?**
- Contracts must be stable (modules depend on them)
- Boundaries must be explicit (prevents architectural drift)
- Interfaces must be documented (enables independent development)
- Changes ripple across many modules (coordination is critical)

**Why neutral for applications?**
- Application logic varies wildly across use cases
- Prototyping is often valuable
- Iteration speed matters
- Teams choose their own trade-offs

**The guideline:** If it crosses a boundary (module-to-module, app-to-kernel), structure it. If it's inside a single module, choose what works.

---

## Summary

| Approach | Use When | Key Benefit |
|----------|----------|-------------|
| **Vibe Coding** | Exploring, learning, prototyping, small fixes | Speed and flexibility |
| **Structured** | Production features, multi-file changes, boundary work | Predictability and coordination |
| **Mixed** | Most real projects | Get the best of both |

**The rule:** Match the tool to the problem. Vibe-code to discover what to build, then structure the implementation.

Neither approach is superior. They solve different problems. The best developers know when to use each.

---
**Previous:** [Ecosystem Quick Map](./09-ecosystem-quick-map.md)
**Next:** [Index](./00-index.md)
