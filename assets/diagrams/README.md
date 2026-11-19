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
| `module-types.dot` | The five primary kernel module protocols plus the internal resolver | `microsoft/amplifier-core/CONTRACTS.md` |
| `dependency-rules.dot` | Allowed (green) and forbidden (red) imports across repo types | `microsoft/amplifier/docs/REPOSITORY_RULES.md` |
| `session-lifecycle.dot` | Bundle load -> mount -> session ready -> execute -> teardown | `microsoft/amplifier-core/CONTRACTS.md` |
| `bundle-composition.dot` | The thin-bundle pattern with foundation + a behavior overlay | `microsoft/amplifier-foundation/docs/BUNDLE_GUIDE.md` |
| `hook-event-flow.dot` | Event fan-out to hook handlers; HookResult precedence | `microsoft/amplifier-core/docs/HOOKS_API.md` |
| `external-app-architecture.dot` | How a host app embeds the kernel: policy from the app, mechanism from the kernel | `microsoft/amplifier-core` `python/amplifier_core/` (`interfaces.py`, `approval.py`, `display.py`, `loader.py`) |

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
4. **Keep the visual style consistent.** The diagrams follow the site theme
   (`css/theme.css`): a dark graphite canvas, bone text, one amber node per diagram.
   - Canvas `bgcolor="#151618"`; text `#efeadf`, secondary text `#9b968b`
   - Helvetica, ~10pt body / ~9pt labels
   - Rounded boxes with `penwidth=1.2-1.3`: a dark tinted fill plus a coloured stroke
   - Edges and edge labels `#75716a` / `#9b968b`
   - Amber marks the one thing the diagram is about (the kernel, the Mount Plan)

## Color conventions (tier coding)

| Tier | Fill | Stroke |
|------|------|--------|
| Kernel (`amplifier-core`) / focal node | `#f2a93b` (text `#1a1b1d`) | `#f2a93b` |
| Modules | `#1f2d25` | `#86c49a` |
| Foundation / Library | `#33271d` | `#ea9a62` |
| Bundles | `#2a2535` | `#b9a2dc` |
| Apps | `#1f2a35` | `#7fb0dd` |
| Agents / cleanup / deny | `#33211f` | `#e2776b` |
| Hook / event payload | `#2d2a1f` | `#e3c58c` |
| Neutral nodes | `#232527` | `#75716a` |
| Clusters | `#1a1b1d` | `#323437` |
| Notes / callout tables | `#1a1b1d` (header `#2e3033`) | `#4a4d51` |
| Allowed / forbidden edges | -- | `#86c49a` / `#e2776b` |

## When to add a new diagram

Add a new diagram if and only if:

- It explains a structural relationship that recurs across multiple docs, or
- It replaces an inline ASCII diagram that would benefit from a vector render.

Diagrams that exist solely to illustrate one example are usually better as ASCII inside
the doc itself.
