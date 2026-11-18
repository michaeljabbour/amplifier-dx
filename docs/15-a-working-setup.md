# A Working Setup

The [Current Ecosystem](./12-current-ecosystem.md) page lists what exists. This page
shows what one long-running install actually composes, so you can see how the pieces
fit together in practice: which root it starts from, which behaviors it layers on,
and which names in `amplifier bundle list` do not mean what they appear to mean.

> **Snapshot: 2026-11-18**, CLI `2026.09.06`, `amplifier-core` 2.0.2. Counts come
> from the files in each repository on that date. Only public repositories are
> listed; private and machine-local bundles in the same install are left out.
> This is one maintainer's setup, not a recommended configuration.

---

## Packaging Kinds

Five names show up in repository prefixes and in `amplifier bundle list`. They are
not five kinds of the same thing.

| Kind | What it is | How to recognise it |
|------|------------|---------------------|
| **Module** (`amplifier-module-*`) | One runtime unit the kernel mounts | A Python package with a single `mount` entry point and no `bundle.md`. The prefix gives the type: `provider-`, `tool-`, `hooks-` / `hook-`, `loop-` (orchestrator), `context-`. |
| **Bundle** (`amplifier-bundle-*`) | A composition unit | A `bundle.md` (or `bundle.yaml`) with `bundle:` metadata and `includes:`, plus conventional directories: `behaviors/`, `agents/`, `context/`, `modes/`, `recipes/`, `skills/`, `modules/`. The prefix is a convention, not a rule: `amplifier`, `amplifier-core`, `amplifier-foundation`, and `amplifier-work-tracker` are all bundles without it. |
| **Behavior** (`behaviors/*.yaml`) | The reusable slice of a bundle | Addressed by URI with `#subdirectory=behaviors/<file>.yaml`. A behavior overlays an existing session without replacing its root bundle. |
| **Smart Tool** | Domain expertise packaged as a tool any agent can use | Defined by [`microsoft/amplifier-smart-tools`](https://github.com/microsoft/amplifier-smart-tools). Typically a Python library with a thin CLI and an optional MCP server, usable from Amplifier or any other agent harness. |
| **Capability** (`amplifier-capability-*`) | A portable, harness-neutral package | A community convention. Still a valid bundle, with a `capability.json` whose `kind` is `skill` or `smart-tool`, and a `SKILL.md` that installs outside Amplifier too. |

The dominant bundle shape is the **thin bundle**: `includes:` is a root plus
`<name>:behaviors/<name>`, and everything the bundle adds lives in the behavior so
it can be added to another session by itself.

Two module repositories, `tool-mcp` and `hook-shell`, also ship a behavior so the
module can be composed like a bundle. They appear in the bundle list as
`mcp-behavior` and `hook-shell-behavior`.

---

## The Root

This install runs on the default root, **Anchors** (`amplifier bundle current`
reports `anchors (default)`). Anchors is a lean host that lives in
[`amplifier-foundation`](https://github.com/microsoft/amplifier-foundation) under
`bundles/anchors`. It mounts the runtime directly and keeps its system prompt short.

| Mounted by Anchors | Modules |
|--------------------|---------|
| Orchestrator | `loop-streaming` (extended thinking on) |
| Context manager | `context-simple` (auto-compact at 0.8) |
| Tools | `tool-filesystem`, `tool-bash`, `tool-web`, `tool-search`, `tool-todo`, `tool-apply-patch`, `tool-delegate`, `tool-skills`, `tool-mode`, `tool-recipes` |
| Hooks | `hooks-todo-reminder`, `hooks-todo-display`, `hooks-session-naming`, `hooks-mode`, `hooks-approval` |
| Agents | `explorer`, `architect`, `builder`, `debugger`, `git-ops`, `researcher` |
| Included behaviors | streaming-ui, status-context, redaction, context-intelligence logging and navigation, routing |

Everything else is layered on top as **app behaviors**: individual
`behaviors/*.yaml` files added with `amplifier bundle add '<uri>' --app`, which
overlay every session without replacing the root. That is the upstream-recommended
pattern, and it is why the bundle list is long: most entries are behaviors or the
bundles they belong to, not alternative roots.

`foundation` is still registered and selectable (`amplifier bundle use foundation`)
as a complete root. It mounts the same base runtime and then includes two dozen
behaviors of its own, among them `recipes`, `design-intelligence`, `python-dev`,
`skills`, `browser-tester`, `superpowers`, `llm-wiki`, `evaluation`, and
`routing-matrix`.

---

## Microsoft Bundles in Use

| Bundle | Agents | Modes | Recipes | Skills | In-repo modules |
|--------|--------|-------|---------|--------|-----------------|
| [`foundation`](https://github.com/microsoft/amplifier-foundation) | 17 | | 10 | 3 | 6 |
| [`amplifier`](https://github.com/microsoft/amplifier) | 1 | | 7 | | |
| [`core`](https://github.com/microsoft/amplifier-core) | 1 | | | | |
| [`recipes`](https://github.com/microsoft/amplifier-bundle-recipes) | 2 | 1 | 3 | 1 | 1 |
| [`superpowers`](https://github.com/microsoft/amplifier-bundle-superpowers) | 6 | 6 | 9 | 3 | |
| [`modes`](https://github.com/microsoft/amplifier-bundle-modes) | 1 | 4 | | 1 | 2 |
| [`skills`](https://github.com/microsoft/amplifier-bundle-skills) | | | | 30 | 1 |
| [`stories`](https://github.com/microsoft/amplifier-bundle-stories) | 12 | | 4 | | |
| [`design-intelligence`](https://github.com/microsoft/amplifier-bundle-design-intelligence) | 7 | | | | |
| [`context-intelligence`](https://github.com/microsoft/amplifier-bundle-context-intelligence) | 5 | 1 | | 12 | 9 |
| [`converge`](https://github.com/microsoft/amplifier-bundle-converge) | 4 | 1 | 1 | 5 | 2 |
| [`work-tracker`](https://github.com/microsoft/amplifier-work-tracker) | 2 | | | 1 | 2 |
| [`attractor`](https://github.com/microsoft/amplifier-bundle-attractor) | 8 | | | 2 | 1 |
| [`browser-tester`](https://github.com/microsoft/amplifier-bundle-browser-tester) | 3 | | 3 | | |
| [`amplifier-tester`](https://github.com/microsoft/amplifier-bundle-amplifier-tester) | 2 | | | | |
| [`digital-twin-universe`](https://github.com/microsoft/amplifier-bundle-digital-twin-universe) | 1 | | | 1 | |
| [`evaluation`](https://github.com/microsoft/amplifier-bundle-evaluation) | | 1 | | | |
| [`llm-wiki`](https://github.com/microsoft/amplifier-bundle-llm-wiki) | 1 | 5 | | | |
| [`python-dev`](https://github.com/microsoft/amplifier-bundle-python-dev) | 2 | | | | 2 |
| [`lsp`](https://github.com/microsoft/amplifier-bundle-lsp) | 1 | | | | 1 |
| [`computer-use`](https://github.com/microsoft/amplifier-bundle-computer-use) | 1 | | | | 2 |
| [`routing-matrix`](https://github.com/microsoft/amplifier-bundle-routing-matrix) | | | | 1 | 1 |
| [`notify`](https://github.com/microsoft/amplifier-bundle-notify) | 1 | | | | 2 |
| [`team-pulse`](https://github.com/microsoft/amplifier-bundle-team-pulse) | | 1 | | | 1 |
| [`wayfinder`](https://github.com/microsoft/amplifier-bundle-wayfinder) | | | | 2 | 1 |
| [`gitea`](https://github.com/microsoft/amplifier-bundle-gitea) | | | | 1 | |
| [`filesystem`](https://github.com/microsoft/amplifier-bundle-filesystem) | | | | | 1 |
| [`redaction`](https://github.com/microsoft/amplifier-bundle-redaction) | | | | | 1 |

Blank means none. Counts are files in each repository's `agents/`, `modes/`,
`recipes/`, `skills/`, and `modules/` directories; recipe examples and test
fixtures are left out where they could be told apart. `routing-matrix` also ships 10 matrix files.

[`amplifier-online`](https://github.com/microsoft/amplifier-bundle-amplifier-online)
is also registered. Upstream marks it as a deprecated bridge that offers to remove
itself.

---

## Community Bundles and Capabilities in Use

Community components run arbitrary code with your permissions. Read the source
before installing.

| Name | Repository | Kind | What it does |
|------|------------|------|--------------|
| `the-usual` | [`danshapiro/bundle-the-usual`](https://github.com/danshapiro/bundle-the-usual) | Bundle | A development workflow: plan, validate load-bearing assumptions, independent cross-model review loops, subagent-driven execution, plain-language recap |
| `impeccable` | [`samueljklee/amplifier-bundle-impeccable`](https://github.com/samueljklee/amplifier-bundle-impeccable) | Bundle | Design-quality enforcement for AI-assisted frontend work, wrapping a deterministic anti-pattern detector |
| `product-bundle` | [`marklicata/amplifier-bundle-tech-bro-idealist`](https://github.com/marklicata/amplifier-bundle-tech-bro-idealist) | Bundle | Nine product-management agents and a one-pager recipe |
| `conformance` | [`michaeljabbour/amplifier-bundle-conformance`](https://github.com/michaeljabbour/amplifier-bundle-conformance) | Bundle | Audits whether a bundle repo is shaped right for the ecosystem, beyond whether it loads |
| `design-loop` | [`michaeljabbour/amplifier-bundle-design-loop`](https://github.com/michaeljabbour/amplifier-bundle-design-loop) | Bundle | Scores a UI, builds a better version, and optionally converges it to a bar |
| `memory` | [`michaeljabbour/amplifier-capability-memory`](https://github.com/michaeljabbour/amplifier-capability-memory) | Capability (skill) | Local-first memory: find the original record without carrying every past session into the current one |
| `preceptor` | [`michaeljabbour/amplifier-capability-preceptor`](https://github.com/michaeljabbour/amplifier-capability-preceptor) | Capability (skill) | Find which instructions still earn their place, and make removal reversible |
| `unknowns` | [`michaeljabbour/amplifier-capability-unknowns`](https://github.com/michaeljabbour/amplifier-capability-unknowns) | Capability (skill) | Find the consequential question before it becomes rework |
| `ux-ergonomist` | [`michaeljabbour/amplifier-capability-ux-ergonomics`](https://github.com/michaeljabbour/amplifier-capability-ux-ergonomics) | Capability (skill) | Evidence-led human factors and UX expertise |
| `teamwork-standalone` | [`michaeljabbour/amplifier-capability-good-teammate`](https://github.com/michaeljabbour/amplifier-capability-good-teammate) | Capability (skill) | Ask the right teammate, preserve what they meant, avoid unnecessary interruption |
| `taste-elegance` | [`michaeljabbour/amplifier-capability-taste-elegance`](https://github.com/michaeljabbour/amplifier-capability-taste-elegance) | Capability (skill) | Review a draft, design, or technical artifact against the user's intent |
| `fast-decisions` | [`michaeljabbour/amplifier-capability-fast-decisions`](https://github.com/michaeljabbour/amplifier-capability-fast-decisions) | Capability (smart tool) | Inspect agent routing decisions and compare task outcomes, cost, and latency in bounded trials |
| `knowledge` | [`michaeljabbour/amplifier-capability-knowledge`](https://github.com/michaeljabbour/amplifier-capability-knowledge) | Capability (smart tool) | Build and explore a graph of supplied notes and research with source and time references |

The capability repositories were renamed twice in late 2026:
`amplifier-bundle-*`, then `amplifier-skill-*` / `amplifier-smart-tool-*`, then
`amplifier-capability-*`. The old URLs redirect.

---

## Modules

Twenty-two runtime modules are registered. All but one are Microsoft-maintained.

| Type | Modules |
|------|---------|
| Orchestrator | `loop-streaming` |
| Context | `context-simple` |
| Providers | `provider-anthropic`, `provider-azure-openai`, `provider-chat-completions`, `provider-gemini`, `provider-github-copilot`, `provider-ollama`, `provider-openai-chatgpt`, `provider-vllm` |
| Tools | `tool-bash`, `tool-filesystem`, `tool-search`, `tool-task`, `tool-todo`, `tool-web` |
| Hooks | `hooks-approval`, `hooks-logging`, `hooks-status-context`, `hooks-streaming-ui`, `hooks-todo-reminder`, [`project-isolation`](https://github.com/michaeljabbour/amplifier-module-hooks-project-isolation) (community) |

Many more modules run than are registered here, because bundles carry their own
modules in a `modules/` directory and mount them by `#subdirectory=modules/<name>`.
Foundation alone ships six that way, including `tool-delegate`. Foundation's own
`tasks` behavior describes `tool-task` as the legacy delegation tool, superseded by
the delegate tool.

---

## Names That Mislead

A few entries in the bundle list are not what the name suggests.

| Name | What it actually is |
|------|---------------------|
| `core` | The kernel repository's own expert bundle: a `core-expert` agent and kernel context. Not a bundle of core tools. |
| `filesystem` | [`amplifier-bundle-filesystem`](https://github.com/microsoft/amplifier-bundle-filesystem), which provides the `apply_patch` tool. Not the `tool-filesystem` module. |
| `redaction` | [`amplifier-bundle-redaction`](https://github.com/microsoft/amplifier-bundle-redaction): the redaction hook plus a library. Foundation's own redaction behavior includes it. |
| `app-cli` | The bundle embedded inside the installed CLI package: a `cli-expert` agent. |
| `product-bundle` | A community bundle whose repository is named `tech-bro-idealist`; the name comes from its `bundle.md`. |
| `mcp-behavior`, `hook-shell-behavior` | Behaviors shipped inside module repositories. |
| `memory` | Here, the community memory capability. Microsoft also publishes a different [`amplifier-bundle-memory`](https://github.com/microsoft/amplifier-bundle-memory). |

Bundles registered from a local file rather than a git source show `unknown` in
the cached and remote columns of `amplifier bundle list`. The list can also retain
entries whose source files no longer exist, such as bundles registered from
temporary directories during a test run.

---

**Previous:** [Built with Amplifier](./14-built-with-amplifier.md)
**Next:** [Index](./00-index.md)
