# Architecture Diagrams

This directory holds the authoritative DOT source for every architectural diagram on the
Amplifier DX site, plus their rendered PNG and SVG outputs.

## Why DOT source files?

- **Reviewable.** Plain text, line-by-line diffs in PRs.
- **Reproducible.** Anyone with `graphviz` installed can regenerate the renders.
- **Versionable.** The source travels with the site.

## Files

| Source | Topic | Verified against |
|--------|-------|-------------------|
| `architecture-stack.dot` | The five tiers and dependency direction | `microsoft/amplifier/docs/REPOSITORY_RULES.md` |
| `module-types.dot` | The five primary kernel module protocols | `microsoft/amplifier-core/CONTRACTS.md` |
| `dependency-rules.dot` | Allowed (green) and forbidden (red) imports across repo types | `microsoft/amplifier/docs/REPOSITORY_RULES.md` |
| `session-lifecycle.dot` | Bundle load -> mount -> session ready -> execute -> teardown | `microsoft/amplifier-core/CONTRACTS.md` |
| `bundle-composition.dot` | The thin-bundle pattern with foundation + a behavior overlay | `microsoft/amplifier-foundation/docs/BUNDLE_GUIDE.md` |
| `hook-event-flow.dot` | Event fan-out to hook handlers; HookResult precedence | `microsoft/amplifier-core/docs/HOOKS_API.md` |

Each `.dot` file has a matching `.png` (high-DPI raster, embedded in the site) and `.svg`
(vector, for high-resolution rendering).

## Regenerating

Requires Graphviz (`brew install graphviz` on macOS).

```bash
cd assets/diagrams
for f in *.dot; do
  name="${f%.dot}"
  dot -Tpng -Gdpi=144 "$f" -o "${name}.png"
  dot -Tsvg "$f" -o "${name}.svg"
done
```

## Editing rules

1. **Edit only the `.dot` source.** Never edit the rendered PNG or SVG by hand.
2. **Re-render after every source change.** Commit the source and renders together.
3. **Verify against the documents listed in the table** before changing any factual claim
   (component names, layer names, protocol signatures, action precedence, etc.).
4. **Keep the visual style consistent.** All diagrams use:
   - Helvetica for text, ~10pt body / ~9pt labels
   - Rounded boxes with `penwidth=1.2-1.3`
   - The colors below for tier-coding

## Color conventions (tier coding)

| Tier | Fill | Stroke |
|------|------|--------|
| Kernel (`amplifier-core`) | `#3a3a3a` (white text) | `#000000` |
| Modules | `#dcf2dc` | `#3a8c3a` |
| Foundation / Library | `#fce8d2` | `#c87a3a` |
| Bundles | `#e2dcfc` | `#7059c8` |
| Apps | `#dceefc` | `#3a86c8` |
| Hook / event payload | `#fff8d2` (no stroke override) | -- |
| Notes / callouts | `#fffaf0` | `#cccccc` |

## When to add a new diagram

Add a new diagram if and only if:

- It explains a structural relationship that recurs across multiple docs, or
- It replaces an inline ASCII diagram that would benefit from a vector render.

Diagrams that exist solely to illustrate one example are usually better as ASCII inside
the doc itself.
