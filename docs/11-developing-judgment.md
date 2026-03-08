# 11 — Developing Judgment: Trust, Intuition, and Working with AI Agents

> How to build calibrated confidence when the machine does the building.

---

## The Trust Problem

When AI generates your code, you face a question that traditional development never asked: **how much should you trust output you didn't write?**

This is not a philosophical question. It is a practical one. Over-trust leads to production bugs from code you never read. Under-trust leads to reading every line of generated code, which defeats the point of using AI in the first place.

The answer is neither "trust everything" nor "trust nothing." It is **calibrated trust** — knowing when to inspect closely and when to let the system work.

---

## The Trust Calibration Curve

Most developers follow a predictable arc when working with AI agents:

### Phase 1: Skepticism (Day 1-3)

You read every line. You rewrite half of what the agent produces. You think "I could have done this faster myself." This is healthy — you are building a mental model of what the agent is good at and where it fails.

**What to do:** Let yourself be skeptical. Read the code. Run the tests. Compare the output against what you would have written. You are not wasting time — you are calibrating.

### Phase 2: Over-Trust (Week 1-2)

The agent has been right often enough that you stop reading carefully. You accept outputs because they "look right." You skip verification because "it passed last time." This is the danger zone.

**What to do:** Notice when you stop verifying. That is the moment to add structure, not remove it. Use verification gates, lint checks, and contract tests as safety nets for the trust you are extending.

### Phase 3: Calibrated Confidence (Week 3+)

You develop intuition about *where* the agent excels and *where* it struggles. You know which kinds of outputs to accept quickly and which to scrutinize. Your trust is conditional on the domain, not universal.

**What to do:** Articulate your calibration to yourself. "I trust the agent with straightforward implementations of well-specified interfaces. I do not trust it with error handling at system boundaries. I always verify test assertions manually."

---

## Signals That Something Is Going Wrong

When working with multi-step agent loops, develop sensitivity to these warning signs:

### In the agent's output

- **Confidence without evidence.** The agent says "all tests pass" but you did not see the test output. Ask for the evidence.
- **Scope creep.** You asked for a cache service and got a cache service with a metrics dashboard. Unasked-for additions usually mean the agent lost track of the spec.
- **Repetitive patterns.** The agent generates three nearly-identical implementations where one with a parameter would do. Agents optimize for "done," not "simple."
- **Vague error handling.** `except Exception: pass` or `// TODO: handle errors` means the agent did not know what to do and hoped you would not notice.

### In your own behavior

- **"Looks right" as verification.** If your review process is scanning code for shape rather than reading for correctness, you are over-trusting.
- **Accepting the first output.** If you never push back or ask for revisions, you are not directing — you are accepting.
- **Skipping tests.** If you start treating "the agent wrote tests" as equivalent to "the code is tested," slow down. Agent-written tests can have the same blindspots as agent-written code.
- **Growing unease you cannot articulate.** A feeling that "something is off" but you cannot point to what. This is often your intuition detecting accumulated implicit decisions. Listen to it.

---

## How Verification Builds Confidence

The counterintuitive truth: **verification is not the opposite of trust — it is the foundation of trust.**

When you verify an agent's output and it passes, your trust is now *earned*, not assumed. When it fails verification, you learn where the agent needs oversight. Over time, this builds a calibration model that is specific to your codebase, your agents, and your domain.

This is why Amplifier's architecture includes explicit verification gates:

| Mechanism | What It Catches | Trust It Enables |
|-----------|-----------------|-----------------|
| **Contract tests** | Interface violations | "The module does what the spec says" |
| **Lint and type checks** | Structural issues | "The code is well-formed" |
| **Critic assessment** | Spec drift and scope creep | "The artifact matches the intent" |
| **Event stream logs** | What actually happened | "I can see every decision the agent made" |

Each verification mechanism lets you trust a specific dimension of the output without trusting blindly.

---

## When to Intervene in an Agent Loop

Multi-step agentic loops (intent -> spec -> build -> verify -> ship) sometimes go sideways. Knowing when to intervene and when to let the loop self-correct is a judgment skill.

**Let the loop work when:**

- A single quality score drops slightly after an iteration (the system will re-route)
- The agent asks a clarifying question (answer it and let the loop continue)
- The first draft is not perfect (that is what iteration is for)

**Intervene when:**

- The agent is solving a different problem than what you asked for (intent drift)
- You see the same issue recurring across iterations (the loop cannot self-correct this class of error)
- The agent is adding complexity to satisfy a constraint you do not actually care about (over-specification)
- Your gut says "this is going in the wrong direction" and you can articulate even vaguely why

**How to intervene well:**

- Redirect at the intent level ("I want X, not Y") rather than the code level ("change line 42")
- Be specific about what is wrong, not just that something is wrong
- If the loop is not converging after two or three iterations, the problem is usually in the intent or the spec, not in the implementation

---

## The Skill Development Question

Developers reasonably worry: *does working with AI agents make me a worse developer?*

The honest answer: it depends on how you work.

**Atrophy risk is real when:**

- You accept every output without understanding it
- You stop being able to explain why your code works
- You could not implement a critical component without AI assistance
- You never read the generated code, only the test results

**Skill development happens when:**

- You review AI output critically and learn from both its strengths and mistakes
- You write the specs yourself (intent and architecture require deep understanding)
- You develop judgment about when to trust and when to verify (a meta-skill)
- You work at a higher level of abstraction — directing architecture rather than typing syntax — which is a *different* skill, not a lesser one

The Amplifier approach specifically mitigates atrophy risk because it requires you to think at the intent and specification level before any code is generated. You cannot declare intent without understanding the problem. You cannot write a module contract without understanding the interface. You cannot verify against a spec without understanding what correct looks like.

**The developer who directs an AI crew is not less skilled than the developer who types every line. They are exercising different skills — and the directing skills are the ones that compound.**

---

## Practical Habits

Build these habits early. They become automatic with practice.

1. **State your verification criteria before generating.** Before asking for code, write down what "correct" looks like. This prevents post-hoc rationalization of whatever the agent produces.

2. **Read the first three outputs carefully.** For any new kind of task, read the agent's output line by line for the first few iterations. This builds your calibration model.

3. **Maintain one thing you always verify manually.** Pick your highest-risk area (security? error handling? data validation?) and always review it yourself, even when you trust everything else.

4. **Articulate your trust boundaries.** Say it out loud or write it down: "I trust this agent with X but not Y." Explicit boundaries are adjustable. Implicit trust is not.

5. **When in doubt, ask the agent to explain.** If you are not sure about an implementation choice, ask why. The explanation either satisfies you (trust increases) or reveals a gap (trust adjusts). Either way, you learned something.

---

## The Emotional Landscape of Directed Development

Working with AI agents introduces emotional experiences that traditional development does not prepare you for:

**The relief of delegation.** When a well-specified task comes back correctly implemented on the first pass, there is a distinct feeling of leverage — your intent became an artifact without the manual translation step. This is the compounding advantage made visceral.

**The anxiety of opacity.** When you are not sure whether the agent understood your intent, there is a specific kind of worry that differs from "did I write a bug?" It is closer to "did I communicate clearly?" The locus of concern shifts from implementation to expression.

**The frustration of compounding mistakes.** When a multi-step loop makes an error in step two that propagates through steps three, four, and five, undoing the chain feels worse than a single bug. You are not debugging code — you are debugging a process. The "oh no" moment is recognizing that the foundation is wrong, not just the surface.

**The satisfaction of verification.** When the critic confirms that the artifact matches the intent, and the tests confirm that the implementation matches the contract, the confidence is qualitatively different from "it seems to work." It is the confidence of evidence, not hope.

**The identity question.** At some point, every developer working with AI agents asks: "Am I still a developer?" The answer is yes — but the skill has shifted. You are exercising judgment, architecture, intent clarity, and verification. These are harder skills than syntax, and they matter more at scale.

None of these emotional experiences are problems to solve. They are the texture of a new way of working. Recognizing them helps you navigate them instead of being thrown by them.

---

*Previous: [Amplifier Philosophy](./10-philosophy.md)*
*Next: [Working with AI](./13-working-with-ai.md)*
*Return to [Index](./00-index.md)*