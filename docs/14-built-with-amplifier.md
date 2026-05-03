# Built With Amplifier: A Case Study

The most credible demonstration of Amplifier we have isn't a feature list. It's the
[`amplifier-app-learn`](https://github.com/michaeljabbour/amplifier-app-learn)
learning platform — a curriculum that teaches Amplifier, audited and extended **by
Amplifier agents**, with diagrams generated from validated DOT sources, and an update
plan structured as a staged recipe.

This is Amplifier teaching Amplifier, then teaching itself how to teach better.

> **About this doc.** It's a case study, not a marketing piece. Every claim below points
> at a specific file or commit you can verify. The site we're describing exists; the work
> is recent (May 2026); some of it is uncommitted in the maintainer's working tree as of
> this writing.

---

## What `amplifier-app-learn` is

A free, static React + Vite SPA hosted on GitHub Pages. It teaches Amplifier across
six progressive levels:

1. **First Principles** — why composability, kernels and shells, anatomy of an agent
2. **The Five Components** — providers, tools, the orchestrator, context, hooks
3. **Modules** — bricks and studs, building a module, the coordinator
4. **Bundles & Composition** — what bundles are, composition in practice, recipes
5. **Events & Observability** — the event bus, session lifecycle, the seven guarantees
6. **The Full Stack** — the three layers, the ecosystem today, the Amplifier mindset, glossary, FAQ

It is **not** built on Amplifier (no kernel, no foundation, no daemon). It uses
Amplifier in a more interesting way: **as the development partner that audits and
maintains the curriculum.**

---

## The Recursive Loop

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│    Amplifier ecosystem (kernel, foundation, modules, bundles)      │
│                                                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ taught by
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│    amplifier-app-learn  (curriculum site)                          │
│                                                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ audited and maintained by
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│    Amplifier expert agents                                         │
│      • amplifier:amplifier-expert                                  │
│      • core:core-expert                                            │
│      • foundation:foundation-expert                                │
│                                                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ produces
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│   docs/state-of-amplifier-2026-05/OVERVIEW.md   (367 lines)        │
│   • Every claim cited with file:line                               │
│   • DOT diagrams with citation headers                             │
│   • UPDATE-PLAN.md structured as staged-recipe approval gates      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

The site teaches Amplifier. Amplifier audits the site. The audit feeds back into the
site as new lessons.

---

## What the Audit Did

[`docs/state-of-amplifier-2026-05/`](https://github.com/michaeljabbour/amplifier-app-learn/tree/main/docs/state-of-amplifier-2026-05)
in the LMS contains the artifact set:

| File | What it is |
|------|-----------|
| `OVERVIEW.md` | 367 lines of citable Amplifier ground-truth, compiled by three named expert agents |
| `GAPS.md` | A 235-line audit identifying what the curriculum had wrong or missing |
| `UPDATE-PLAN.md` | A 4-batch (A → B → C → D) plan with explicit `🛑 Gate A/B/C/D` checkpoints |
| `dot/01..05-*.dot` | Five DOT diagrams with citation headers (`Source: amplifier-core/CONTRACTS.md lines 28–55`) |
| `svg/01..05-*.svg` | Renders of those DOTs |
| `upstream-pr/` | A drafted PR back into `microsoft/amplifier/docs/MODULES.md` for ecosystem-level corrections |

Each diagram's source DOT carries a header like:

```dot
// Amplifier — The six module types around the Coordinator
// Source: amplifier-core:CONTRACTS.md line 55 (ModuleType literal)
//         amplifier-core:CONTRACTS.md lines 28–38 (Trait↔Protocol Mapping)
// Verified 2026-05-02 by core:core-expert
```

This is the same pattern this DX site now uses — see [the diagram sources file](../assets/diagrams/SOURCES.md).

---

## The UPDATE-PLAN as a Staged Recipe

This is the part that makes the loop *executable*, not just illustrative.

`UPDATE-PLAN.md` is structured with explicit gates: Batch A produces drafts only
(no curriculum touched); Batch B is tightly-scoped factual edits (callouts, glossary
additions); Batch C creates new lessons; Batch D handles repo hygiene. Between each
batch is an approval gate, by design.

That structure maps directly onto an [Amplifier staged recipe](../assets/diagrams/bundle-composition.png) —
the kind that ships in [`amplifier-bundle-recipes`](https://github.com/microsoft/amplifier-bundle-recipes).
The maintainer wrote the plan in a form designed to be *executed* by a recipe, not
just read by a human.

Translation, conceptually:

```yaml
name: lms-curriculum-update-2026-05
description: Apply the validated state-of-amplifier audit to the curriculum
stages:
  - name: drafts
    agent: amplifier:amplifier-expert
    prompt: "Compile state-of-amplifier overview, gaps, plan, and DOT diagrams"
  - name: review-drafts
    approval: required          # Gate A
  - name: factual-edits
    agent: foundation:modular-builder
    prompt: "Apply the B-batch tightly-scoped edits per UPDATE-PLAN.md"
  - name: review-edits
    approval: required          # Gate B
  - name: new-lessons
    agent: stories:case-study-writer
    prompt: "Create the C-batch new lessons per UPDATE-PLAN.md"
  - name: review-lessons
    approval: required          # Gate C
  - name: hygiene
    agent: foundation:modular-builder
    prompt: "Apply the D-batch repo hygiene changes per UPDATE-PLAN.md"
  - name: final-review
    approval: required          # Gate D
```

The maintainer ran these by hand this time. The next iteration of this curriculum
update could be a literal recipe execution.

---

## The Chat Companion

The site ships a learning companion in the sidebar of every lesson page. It's a thin
React component (`src/contexts/ChatContext.jsx`) calling `api.openai.com` directly,
but the system prompt is a careful piece of UX engineering:

- **Lesson-aware** — receives `currentLesson.title` and `slug` so it can anchor answers
  to the page the learner is on
- **Viewport-aware** — knows whether it's `mobile` / `sidebar` / `fullscreen` and
  adjusts response length and visual density accordingly
- **Three visual outputs** — text only is the floor; the prompt teaches the model to
  emit `interactive` HTML widgets, `dot` Graphviz blocks (rendered live by `@viz-js/viz`
  WASM), or named `visual` references to pre-built widgets in `public/visuals/`
- **Socratic mode** — a toggle that flips the assistant from answering to asking
  guiding questions

That system prompt has been canonicalized as a portable Amplifier skill in this repo:
[`skills/learning-companion/SKILL.md`](../skills/learning-companion/SKILL.md). Any
Amplifier session can load it and become a curriculum-aware companion.

---

## What This Demonstrates

Three Amplifier patterns are visible in this case:

1. **Specialist agents as context sinks.** The audit was performed by three named
   agents — `amplifier:amplifier-expert`, `core:core-expert`,
   `foundation:foundation-expert`. Each holds heavy upstream documentation
   `@`-mentioned in its own context. The maintainer's session never paid the token
   cost for hundreds of pages of docs. The result is a 367-line OVERVIEW that took a
   single short conversation to commission.

2. **Staged recipes as a maintenance interface.** Restructuring the update plan as
   gated stages turned a documentation-edit task into a recipe spec. The same
   structure that makes the plan readable also makes it executable.

3. **DOT-as-source-of-truth.** Every architectural diagram on this DX site and on
   the LMS site is generated from a `.dot` file with a citation header. SVG renders
   are committed alongside their sources. CI verifies they match before merge.

You can adopt any of these patterns without rebuilding your stack on Amplifier. The
LMS is a React + Vite SPA. It uses Amplifier as a development partner, not a runtime.

---

## How to Try It

| Want to | Do this |
|---------|---------|
| Read the audit | [`OVERVIEW.md`](https://github.com/michaeljabbour/amplifier-app-learn/blob/main/docs/state-of-amplifier-2026-05/OVERVIEW.md) — every claim is cited |
| See the maintenance recipe | [`UPDATE-PLAN.md`](https://github.com/michaeljabbour/amplifier-app-learn/blob/main/docs/state-of-amplifier-2026-05/UPDATE-PLAN.md) — read the `🛑 Gate` markers |
| Use the learning companion | Load [`skills/learning-companion/SKILL.md`](../skills/learning-companion/SKILL.md) into any Amplifier session |
| Run the site locally | Clone `amplifier-app-learn`, `npm install && npm run dev`, visit `localhost:5175` |
| Replicate the pattern in your own docs | Use named expert agents to compile a citable ground-truth doc for your own ecosystem; structure the resulting maintenance work as a staged recipe |

---

## Round-Trip: How This Doc Maps to the Curriculum

This case study tells the meta-story from the docs-site side. The curriculum tells
the same story from the inside, in the
[**How This Site Was Built**](https://github.com/michaeljabbour/amplifier-app-learn/blob/main/src/content/learn/05-full-stack/how-this-was-built.js)
lesson at the end of Level 5 (`05-full-stack/how-this-was-built`). Same recursive loop, learner-facing voice,
embedded diagram, four-question knowledge check. Either entry point lands you in the
same place.

The `learning-companion` skill in this repo is also reciprocally consumed: the LMS
loads the canonical `SKILL.md` body via Vite's `?raw` import (`src/content/learning-companion-skill.md`)
so its inline chat assistant and any Amplifier session loading the skill are running
the same prompt. One source, two surfaces.

---

## Status (May 2026)

- ✅ Audit committed (`docs(audit): state-of-amplifier 2026-05`)
- ✅ Curriculum updates committed (Batches B and C)
- ✅ README rewritten with the BYOK section explicit
- ✅ BYOK disclosure shipped: permanent callout in chat settings, one-time confirmation
  modal on first key save, key prefix versioned (`amplifier-learn-api-key-disclosure-acknowledged-v1`)
  so future copy changes can re-prompt
- ✅ Chat system prompt refactored to load from the canonical artifact via `?raw`
- ✅ `How This Site Was Built` lesson live in the curriculum
- ✅ The seventh pillar ("Don't Break the Edges") added to both the LMS curriculum
  and ecosystem documentation
- 🚧 [`microsoft/amplifier#279`](https://github.com/microsoft/amplifier/pull/279) — upstream PR for `MODULES.md` corrections, awaiting reviewer
- 🚧 The Netlify proxy for the chat companion remains in `ROADMAP-CHAT.md`. README
  and the disclosure modal both gate "public companion-as-a-service" framing on the
  proxy shipping first.

---

**Previous:** [Current Ecosystem](./12-current-ecosystem.md)  
**Next:** [Working with AI](./13-working-with-ai.md)
