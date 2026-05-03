# Diagram Sources & Cross-Repo Provenance

This file is the authoritative cross-reference between this DX site's diagrams and the
sister curriculum site at
[`amplifier-app-learn`](https://github.com/michaeljabbour/amplifier-app-learn). Both
projects rely on the same upstream source-of-truth files; this index keeps them honest.

## The Two Diagram Sets

| Set | Location | Audience | Style |
|-----|----------|----------|-------|
| **DX site** (this repo) | `assets/diagrams/*.dot` | Developers reading the docs site | Six topics, focused fan-out views |
| **Learn site** | `amplifier-app-learn/docs/state-of-amplifier-2026-05/dot/*.dot` | Learners going through the curriculum | Five topics, broader system views |

Both sets carry citation headers pointing at the same upstream files
(`amplifier-core/CONTRACTS.md`, `amplifier-core/events.rs`,
`amplifier-foundation/docs/BUNDLE_GUIDE.md`, `amplifier/docs/REPOSITORY_RULES.md`,
`amplifier/docs/MODULES.md`). When upstream changes, both sets must update.

## Topic Cross-Reference

| Topic | This DX site | amplifier-app-learn | Notes |
|-------|--------------|---------------------|-------|
| **Repo dependency hierarchy** | `architecture-stack.dot` | `01-ecosystem-map.dot` + `09-architecture-stack.dot` (DX-imported) | DX is more compact (5 tiers). Learn keeps both: the broader ecosystem map and the imported DX-style 5-tier stack used in the *How This Site Was Built* lesson. |
| **Layered architecture (kernel boundary)** | covered inside `architecture-stack.dot` | `02-layered-architecture.dot` | Learn has a dedicated diagram. |
| **Module types** | `module-types.dot` (six types) | `03-module-types.dot` (six types) | **Reconciled May 2026**: both show six types including `resolver` (advanced/internal, no public contract doc). |
| **Session lifecycle** | `session-lifecycle.dot` (full per-turn loop + teardown) | `04-session-lifecycle.dot` (two-wave mount focus) | Complementary, not redundant. |
| **Event taxonomy** | covered in `hook-event-flow.dot` (one event fanning out) | `05-event-taxonomy.dot` (all 43 events by category) | Different focus. Learn shows the full canonical list; DX shows what happens at one event. |
| **Dependency rules (allowed vs forbidden)** | `dependency-rules.dot` | imported as `06-*.dot` (May 2026) | Originated in DX; LMS imported it during the May audit. |
| **Bundle composition (thin bundle pattern)** | `bundle-composition.dot` | imported as `07-*.dot` (May 2026) | Originated in DX; imported into LMS. |
| **Hook event flow with action precedence** | `hook-event-flow.dot` | imported as `08-*.dot` (May 2026) | Originated in DX; imported into LMS. |

## Counts and Names — Agreed State (May 2026)

These were reconciled across both sites during the May 2026 audit:

| Claim | Agreed value | Source of truth |
|-------|--------------|-----------------|
| Module types | **6** (provider, tool, orchestrator, context, hook, resolver) | `amplifier-core/CONTRACTS.md` ModuleType literal |
| Canonical events | **43** | `amplifier-core/events.rs` `ALL_EVENTS` |
| Microsoft + community bundles | **28+** | `amplifier/docs/MODULES.md` |
| Library layer name | **`amplifier-foundation`** | not "amplifier-helpers" — that name never shipped |
| `@tool` decorator existence | **does not exist** | `amplifier-foundation` exports no `tool` symbol |

Anywhere those numbers or names appear in a diagram, they should match the table above.

## Regeneration

```bash
cd assets/diagrams
for f in *.dot; do
  name="${f%.dot}"
  dot -Tpng -Gdpi=144 "$f" -o "${name}.png"
  dot -Tsvg "$f" -o "${name}.svg"
done
```

CI verifies that committed SVGs match what `dot` would produce — see
`.github/workflows/render-diagrams.yml`.

## Long-Term Direction

The two diagram sets have ~40% topic overlap and 100% upstream-source overlap. A
single canonical diagram set living in a third location (a sibling repo, or a git
submodule shared by both) would eliminate the reconciliation burden. Until that
exists, this file is the contract between the two sites — when one updates, the
other should too.

If you spot a discrepancy that this file does not document, either:
- Update both diagram sets to match upstream, then update this file, or
- Document the intentional difference here with a one-line rationale.
