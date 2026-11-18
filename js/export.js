// ==========================================================================
// EXPORT FUNCTIONALITY
// ==========================================================================

/**
 * Toggle export menu dropdown
 */
function toggleExportMenu() {
  const menu = document.getElementById('export-menu');
  const caret = document.getElementById('export-caret');
  if (menu && caret) {
    menu.classList.toggle('show');
    caret.classList.toggle('open');
  }
}

// Close export menu on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.export-wrap')) {
    const menu = document.getElementById('export-menu');
    const caret = document.getElementById('export-caret');
    if (menu) menu.classList.remove('show');
    if (caret) caret.classList.remove('open');
  }
});

/**
 * Quick reference markdown content (legacy - kept for backward compatibility)
 *
 * Verified against amplifier-app-cli 2026.09.06 and amplifier-core 2.0.2.
 */
const MARKDOWN_CONTENT = `# Amplifier Quick Reference

> The ultra-thin kernel for modular AI agents

## Installation
\`\`\`bash
uv tool install git+https://github.com/microsoft/amplifier
amplifier init                     # first-run wizard: providers and routing
\`\`\`

## CLI Commands
\`\`\`bash
amplifier                          # Interactive chat
amplifier run "prompt"             # Single command
amplifier run -B foundation "..."  # With a specific bundle
amplifier continue                 # Resume the most recent session
amplifier session list             # List sessions
amplifier bundle list              # List bundles
\`\`\`

## Bundles
- \`anchors\` is the default root. \`foundation\` is a selectable complete root.
- Add a capability to the existing host as a behavior:
  \`amplifier bundle add '<git-uri>#subdirectory=behaviors/<name>.yaml' --app\`

## Agents
List with \`amplifier agents list\` or \`/agents\` in chat. The model delegates to them
with the \`delegate\` tool; agents are addressed as \`bundle:agent\` (for example \`anchors:explorer\`).

---
*See AGENTS.md export for comprehensive documentation*
`;

/**
 * Comprehensive AGENTS.md / CLAUDE.md content for AI assistants
 *
 * Every command, key and signature here was checked against the installed
 * amplifier-app-cli 2026.09.06 (commit 569c9b8), amplifier-core 2.0.2 and
 * amplifier-foundation main as of 2026-11-17. Re-verify before changing.
 */
const AGENTS_CONTENT = `# AGENTS.md - Amplifier Framework Guide

> For AI assistants working with Amplifier codebases.
> Verified against amplifier-app-cli 2026.09.06, amplifier-core 2.0.2 and
> amplifier-foundation main (2026-11-17). Amplifier moves quickly: when a command
> or key here disagrees with \`amplifier <command> --help\` or the source, trust those.

## What is Amplifier?

Amplifier is Microsoft's open-source **AI agent orchestration system**. A small kernel
(\`amplifier-core\`, a Rust kernel with Python bindings) provides mechanisms; policy lives
in swappable modules at the edges. Sessions are configured by composing **bundles**.

**One-sentence definition:** *"A kernel plus modules for building AI agents, composed through bundles: markdown files with YAML frontmatter that compile to a mount plan."*

**Profiles and collections no longer exist.** They were replaced by bundles. There is no
\`amplifier profile\` or \`amplifier collection\` command and no \`--profile\` flag. If you see
them in older material, translate to \`amplifier bundle ...\` and \`--bundle\`.

---

## Quick Start Commands

\`\`\`bash
# Installation
uv tool install git+https://github.com/microsoft/amplifier
amplifier init                      # first-run wizard: providers and routing

# Running
amplifier                           # Interactive mode
amplifier run "Your prompt"         # Single command
amplifier run -B foundation "..."   # With a specific bundle
amplifier run -p anthropic -m <model> "..."   # Pin provider and model for this run
amplifier continue                  # Resume the most recent session
amplifier resume                    # Pick a session to resume

# Bundles
amplifier bundle current            # Active bundle
amplifier bundle list               # Available bundles
amplifier bundle use <name>         # Select a root bundle
amplifier bundle add '<uri>' --app  # Compose a behavior onto every session

# Inspection
amplifier session list              # Sessions for this project (--all-projects for all)
amplifier agents list               # Agents available from bundles
amplifier tool list                 # Tools mounted by the active bundle
amplifier module list               # Installed modules
amplifier provider list             # Configured providers
amplifier routing show              # Effective model routing per role
\`\`\`

---

## Architecture: Layers

Understanding where code belongs is critical:

\`\`\`
APPLICATION LAYER (amplifier-app-cli, amplifierd, your app)
├── Policy decisions (what to do)
├── UX: approval prompts, display, transport
├── Settings persistence
└── Which bundles and modules to load

LIBRARY LAYER (amplifier-foundation)
├── Bundle parsing and composition
├── Module resolution, download and cache
└── PreparedBundle: builds a session, then gets out of the way

KERNEL LAYER (amplifier-core)
├── Session lifecycle
├── Module coordination and mount points
├── Hook registry and event dispatch
├── Cancellation
└── Module contracts

MODULE LAYER (amplifier-module-*, or modules/ inside a bundle)
├── Providers (talk to LLMs)
├── Tools (execute actions)
├── Hooks (observe and intercept events)
├── Orchestrators (the agent loop)
└── Context managers (conversation state)
\`\`\`

### The Import Rule

- Apps import foundation and core.
- Foundation imports core.
- Modules import **only** core. Never foundation, never app code.
- A module that needs something from the app asks the coordinator for a capability.

| Package | Purpose | When to modify |
|---------|---------|----------------|
| \`amplifier-core\` | Kernel mechanisms and contracts | Rarely |
| \`amplifier-foundation\` | Bundle primitives, module resolution, root bundles | To change how bundles compose |
| \`amplifier-app-cli\` | Reference CLI | UX and CLI commands |
| \`amplifier-module-*\` | Individual capabilities | Most extension work |
| \`amplifier-bundle-*\` | Composition: behaviors, agents, context, modes, recipes, skills | To package a capability |

---

## The Five Module Protocols

Protocols are structural (duck typed). No inheritance is required.

| Module | Key method | Purpose | Example |
|--------|-----------|---------|---------|
| **Provider** | \`async complete(request: ChatRequest, **kwargs) -> ChatResponse\` | Call an LLM | \`provider-anthropic\` |
| **Tool** | \`async execute(input: dict) -> ToolResult\` | Run an action | \`tool-filesystem\`, \`tool-bash\` |
| **ContextManager** | \`add_message\`, \`get_messages_for_request\`, \`get_messages\`, \`set_messages\`, \`clear\` | Conversation state | \`context-simple\` |
| **Orchestrator** | \`async execute(prompt, context, providers, tools, hooks, **kwargs) -> str\` | The agent loop | \`loop-streaming\` |
| **Hook handler** | \`async __call__(event: str, data: dict) -> HookResult\` | Observe or intercept | \`hooks-approval\` |

A Provider also exposes \`name\`, \`get_info()\`, \`list_models()\` and \`parse_tool_calls()\`.
A Tool also exposes \`name\`, \`description\` and \`input_schema\`.
ContextManager has no \`compact()\` method: compaction happens inside
\`get_messages_for_request()\` and must be non-destructive.

### HookResult Actions

- \`continue\` - Proceed (default)
- \`deny\` - Block the operation, with a \`reason\`
- \`modify\` - Replace the event data passed to later handlers
- \`inject_context\` - Add a message to the conversation
- \`ask_user\` - Pause for user approval

Precedence when several handlers respond: \`deny > ask_user > inject_context > modify > continue\`.
Handlers run in priority order (lower number first). \`deny\` stops dispatch immediately.
There is no \`allow\` action.

**Dispatch is fail-open:** a handler that raises is logged and skipped. A security hook
must return \`deny\` explicitly; it must not rely on an exception to block.

---

## Bundles

A bundle is a markdown file with YAML frontmatter (or a plain \`.yaml\` file). The
frontmatter compiles to a mount plan; the markdown body of the **root** bundle becomes
the system instruction.

\`\`\`yaml
---
bundle:
  name: my-host
  version: 1.0.0
  description: Example host

includes:
  - bundle: git+https://github.com/microsoft/amplifier-foundation@main#subdirectory=bundles/anchors/bundle.md

tools:
  - module: tool-web
    source: git+https://github.com/microsoft/amplifier-module-tool-web@main
---

You are a senior engineer working on this repository.
\`\`\`

Frontmatter keys that are read: \`bundle\` (\`name\`, \`version\`, \`description\`, \`display_name\`),
\`includes\`, \`session\` (\`orchestrator\`, \`context\`), \`providers\`, \`tools\`, \`hooks\`, \`agents\`,
\`context\`, \`spawn\`. There is no top-level \`name:\`, \`version:\` or \`extends:\`; use \`bundle:\`
and \`includes:\`.

### Behaviors

A behavior is a partial bundle, by convention at \`behaviors/<name>.yaml\`. It adds agents,
context, tools or hooks, and deliberately does not choose a provider, an orchestrator or a
root instruction. Behaviors are the unit you add to an existing host:

\`\`\`bash
amplifier bundle add 'git+https://github.com/microsoft/amplifier-bundle-recipes@main#subdirectory=behaviors/recipes.yaml' --app
\`\`\`

Single-quote the URI so the shell does not expand the \`#\` fragment.

### Composition Rules

| Section | Rule |
|---------|------|
| \`session\`, \`spawn\` | Deep merge; later wins |
| \`providers\`, \`tools\`, \`hooks\` | Merge by module ID; same ID deep-merges config |
| \`agents\` | Merge by name; later wins |
| \`context\` | Accumulates |
| Markdown body | Replaced; later wins |

Includes are composed first, then the including bundle, so the includer wins.

### References

- In the markdown body: \`@namespace:path\` (for example \`@anchors:context/system.md\`).
- In YAML (\`includes\`, \`agents.include\`, \`context.include\`): \`namespace:path\` with **no** \`@\`.

### Root Bundles

- \`anchors\` - the default root. A lean host: \`loop-streaming\`, \`context-simple\`, a standard
  tool roster, and six agents. Lives in \`amplifier-foundation\` under \`bundles/anchors\`.
- \`foundation\` - a selectable complete root with a larger set of included behaviors.

---

## Configuration System

Settings merge in this order (later wins):

\`\`\`
~/.amplifier/settings.yaml                         (global)
  ↓
.amplifier/settings.yaml                           (project: the exact working directory)
  ↓
.amplifier/settings.local.yaml                     (local, gitignored)
  ↓
~/.amplifier/projects/<slug>/sessions/<id>/settings.yaml   (session)
\`\`\`

Project scope is the exact current directory. There is no upward walk.

\`\`\`yaml
bundle:
  active: anchors              # selected root (amplifier bundle use)
  added:                       # name -> URI registrations (amplifier bundle add)
    recipes: git+https://github.com/microsoft/amplifier-bundle-recipes@main
  app:                         # composed onto every session (amplifier bundle add --app)
    - git+https://github.com/microsoft/amplifier-bundle-recipes@main#subdirectory=behaviors/recipes.yaml
config:
  providers:
    - id: anthropic-primary
      module: provider-anthropic
      source: git+https://github.com/microsoft/amplifier-module-provider-anthropic@main
      config:
        api_key: \${ANTHROPIC_API_KEY}
        default_model: <model>
        priority: 1            # lower number = preferred
\`\`\`

A provider **module** can back several configured **instances**, told apart by \`id\`.
Keep secrets in environment variables and reference them as \`\${VAR}\`.

---

## Writing a Module

Every module is a Python package with a module-level \`mount()\` function, registered under
the \`amplifier.modules\` entry-point group.

\`\`\`python
from typing import Any

from amplifier_core import ToolResult


class WordCountTool:
    name = "word_count"
    description = "Count the words in a piece of text"
    input_schema = {
        "type": "object",
        "properties": {"text": {"type": "string"}},
        "required": ["text"],
    }

    async def execute(self, input: dict[str, Any]) -> ToolResult:
        return ToolResult(success=True, output={"words": len(input["text"].split())})


async def mount(coordinator, config: dict[str, Any] | None = None):
    await coordinator.mount("tools", WordCountTool(), name="word_count")
\`\`\`

\`\`\`toml
[project.entry-points."amplifier.modules"]
tool-word-count = "amplifier_module_tool_word_count:mount"
\`\`\`

- Mount points: \`orchestrator\`, \`context\` (single slot); \`providers\`, \`tools\` (named).
- Hooks do not use \`coordinator.mount()\`. Register them with
  \`coordinator.hooks.register(event, handler, priority=0, name=None)\`.
- If \`mount()\` returns a callable it is called at teardown as cleanup.
- Modules may also live inside a bundle under \`modules/<name>\` and be referenced with
  \`#subdirectory=modules/<name>\`.
- Validate with \`amplifier module validate\`.

---

## Events

The kernel defines 43 canonical events (\`amplifier_core.events\`). The kernel itself emits
only the session and module lifecycle events; everything else is emitted by modules,
mostly the orchestrator.

| Emitted by | Events |
|------------|--------|
| Kernel | \`session:start\` or \`session:resume\` (on the first \`execute()\`), \`session:fork\`, \`session:end\`, \`cancel:completed\`, \`module:load_failed\` |
| Orchestrator (contract) | \`execution:start\`, \`execution:end\`, \`orchestrator:complete\`, \`provider:request\`, \`tool:pre\`, \`tool:post\` |
| Provider (typical) | \`llm:request\`, \`llm:response\` |

\`tool:pre\` carries \`tool_name\` and \`tool_input\`; \`tool:post\` adds \`tool_result\`. Event
matching is by exact name. There is no wildcard subscription.

Emitting \`tool:pre\` and \`tool:post\` is an orchestrator obligation, not something the
kernel enforces. A custom orchestrator that skips them bypasses approval hooks.

---

## Guarantees and Their Limits

1. **Hook precedence is fixed** - \`deny > ask_user > inject_context > modify > continue\`.
2. **Handlers run in priority order** - Sequentially, lower number first.
3. **Hooks can block; tools cannot** - Put security in hooks, and return \`deny\` explicitly.
4. **Modules are isolated** - A module depends only on the kernel.
5. **Teardown order** - \`session:end\` fires before module cleanup callables run.
6. **Orchestrator or context failure aborts the session; provider, tool or hook load
   failure does not** - It logs, emits \`module:load_failed\`, and the session continues.
   Check for it rather than assuming everything mounted.

Not guaranteed by the kernel: that every tool call passes through hooks (orchestrator
obligation), or that context is never summarized (context managers compact automatically).

---

## Agents, Modes, Recipes, Skills

- **Agents** are bundles whose frontmatter uses \`meta:\` (\`name\`, \`description\`,
  optional \`model_role\`) instead of \`bundle:\`. They live in a bundle's \`agents/\` directory
  and are addressed as \`bundle:agent\`. The model reaches them through the \`delegate\` tool.
  The older \`task\` tool is legacy.
- **Modes** are runtime behavior overlays, switched with \`/mode\` in chat (\`/modes\` lists them).
- **Recipes** are multi-step workflows declared in YAML, run by the recipes tool.
- **Skills** are \`SKILL.md\` files loaded on demand by the skills tool (\`/skills\` lists them).
- **Routing** maps an agent's \`model_role\` to a model through a routing matrix
  (\`amplifier routing list\`, \`amplifier routing use <matrix>\`). It applies only when the
  composed bundle mounts a routing hook.
- **MCP** servers are reached through the \`tool-mcp\` module.

---

## Programmatic Usage (Embedding)

\`\`\`python
import asyncio
from pathlib import Path

from amplifier_foundation import load_bundle


async def main():
    anchors = await load_bundle(
        "git+https://github.com/microsoft/amplifier-foundation@main"
        "#subdirectory=bundles/anchors/bundle.md"
    )
    provider = await load_bundle(
        "git+https://github.com/microsoft/amplifier-foundation@main"
        "#subdirectory=providers/anthropic-sonnet.yaml"
    )

    composed = anchors.compose(provider)      # takes Bundle objects; later wins
    prepared = await composed.prepare()       # do once: resolves and activates modules

    session = await prepared.create_session(session_cwd=Path.cwd())
    async with session:
        print(await session.execute("Hello! What can you help me with?"))


asyncio.run(main())   # requires ANTHROPIC_API_KEY
\`\`\`

\`AmplifierSession\` has \`initialize()\`, \`execute(prompt) -> str\` and \`cleanup()\`, and is an
async context manager. There is no \`run()\`, \`stream()\`, \`close()\`, \`on()\` or \`fork()\`.
\`create_session()\` returns an already-initialized session. Register hooks with
\`session.coordinator.hooks.register(event, handler)\`.

To drive sessions from another language, use \`amplifierd\` (REST and SSE) or
\`amplifier-agent\` (Python/TypeScript bindings, HTTP and ACP).

---

## Key Repositories

| Repository | Purpose |
|------------|---------|
| \`microsoft/amplifier\` | Entry point, installer, component catalog (\`docs/MODULES.md\`) |
| \`microsoft/amplifier-core\` | Kernel: sessions, contracts, hooks, events |
| \`microsoft/amplifier-foundation\` | Bundle library; ships the \`anchors\` and \`foundation\` roots |
| \`microsoft/amplifier-app-cli\` | Reference CLI |
| \`microsoft/amplifierd\` | Localhost HTTP daemon over core and foundation |
| \`microsoft/amplifier-agent\` | Embeddable engine with Python/TypeScript bindings |
| \`microsoft/amplifier-bundle-*\` | Bundles: recipes, superpowers, modes, skills, routing-matrix, ... |
| \`microsoft/amplifier-module-*\` | Runtime modules |

---

## Documentation Navigation

| Section | Content |
|---------|---------|
| **Home** | Overview and quick links |
| **Quickstart** | Installation and first steps |
| **Architecture** | Layers, data flow, protocols |
| **Philosophy** | Design principles |
| **Guides** | Architecture boundaries, module development |
| **Reference** | Contracts, hooks, events, sessions, agents |
| **CLI** | Command reference |
| **Ecosystem** | Applications, bundles, modules, Smart Tools |
| **Showcase** | Community work |
| **Examples** | Code samples and patterns |

---

## Rules for Working with Amplifier Code

1. **Check the layer** - Know whether you are in app, foundation, kernel or module code before editing
2. **Respect the import rule** - Modules import only \`amplifier-core\`
3. **Keep policy out of the kernel** - The kernel provides mechanism
4. **Security lives in hooks** - Return \`deny\`; never rely on an exception
5. **Package capabilities as behaviors** - So they compose onto any host
6. **Compose, don't copy** - Use \`includes:\` rather than duplicating a bundle
7. **Verify against the installed build** - \`amplifier <command> --help\` is the authority for commands

---

## Common Mistakes to Avoid

- Using \`amplifier profile\`, \`amplifier collection\`, \`--profile\`, or \`extends:\` (all gone)
- Calling \`session.run()\` or \`Config.from_profile()\` (they do not exist)
- Writing \`@namespace:path\` inside YAML (the \`@\` form is for the markdown body only)
- Returning \`HookResult(action="allow")\` (the action is \`continue\`)
- Mounting hooks with \`coordinator.mount("hooks", ...)\` (it raises; use \`coordinator.hooks.register\`)
- Adding policy logic to \`amplifier-core\`
- Hardcoding a provider or model in a tool
- Putting secrets in bundles or settings (reference environment variables)

---

*Generated from Amplifier DX Documentation*
*Full docs: https://michaeljabbour.github.io/amplifier-dx/*
*Repository: https://github.com/microsoft/amplifier*
`;

/**
 * Generate full documentation markdown from page content
 */
function generateFullGuideMarkdown() {
  const sections = [
    { id: 'home', title: 'Overview' },
    { id: 'quickstart', title: 'Quickstart' },
    { id: 'architecture', title: 'Architecture' },
    { id: 'philosophy', title: 'Philosophy' },
    { id: 'guides', title: 'Guides' },
    { id: 'reference', title: 'Reference' },
    { id: 'cli', title: 'CLI Commands' },
    { id: 'ecosystem', title: 'Ecosystem' },
    { id: 'showcase', title: 'Showcase' },
    { id: 'examples', title: 'Examples' },
    { id: 'contribute', title: 'Contributing' }
  ];

  let markdown = `# Amplifier Complete Guide

> The ultra-thin kernel for modular AI agents

Generated from Amplifier DX Documentation on ${new Date().toLocaleDateString()}

---

`;

  sections.forEach(({ id, title }) => {
    const section = document.getElementById('section-' + id);
    if (section) {
      markdown += `# ${title}\n\n`;

      // Extract text content, preserving code blocks
      const clone = section.cloneNode(true);

      // Remove script tags and style tags
      clone.querySelectorAll('script, style, .mermaid').forEach(el => el.remove());

      // Convert code blocks
      clone.querySelectorAll('pre code').forEach(code => {
        const lang = code.className.replace('language-', '').split(' ')[0] || '';
        code.parentElement.outerHTML = `\n\`\`\`${lang}\n${code.textContent}\n\`\`\`\n`;
      });

      // Convert inline code
      clone.querySelectorAll('code').forEach(code => {
        if (!code.closest('pre')) {
          code.outerHTML = `\`${code.textContent}\``;
        }
      });

      // Convert headers
      clone.querySelectorAll('h1, h2, h3, h4').forEach(h => {
        const level = parseInt(h.tagName[1]) + 1; // Offset by 1 since we added section title
        h.outerHTML = `\n${'#'.repeat(Math.min(level, 6))} ${h.textContent}\n`;
      });

      // Convert lists
      clone.querySelectorAll('li').forEach(li => {
        li.outerHTML = `- ${li.textContent}\n`;
      });

      // Get text content
      let text = clone.textContent || '';

      // Clean up excessive whitespace
      text = text.replace(/\n{3,}/g, '\n\n').trim();

      markdown += text + '\n\n---\n\n';
    }
  });

  markdown += `
---
*Generated from Amplifier DX Documentation*
*Visit: https://michaeljabbour.github.io/amplifier-dx/*
`;

  return markdown;
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {number} duration - Duration in ms (default 2000)
 */
function showToast(message, duration = 2000) {
  // Remove existing toast if any
  const existing = document.getElementById('copy-toast');
  if (existing) existing.remove();

  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'copy-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #10b981;
    color: white;
    padding: 16px 32px;
    border-radius: 8px;
    font-size: 18px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    animation: toastFadeIn 0.2s ease-out;
  `;

  // Add animation keyframes if not present
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes toastFadeIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes toastFadeOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    toast.style.animation = 'toastFadeOut 0.2s ease-out forwards';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

/**
 * Copy AGENTS.md content to clipboard
 */
function copyMarkdown() {
  navigator.clipboard.writeText(AGENTS_CONTENT).then(() => {
    showToast('Copied!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy', 2000);
  });
  toggleExportMenu();
}

/**
 * Download AGENTS.md reference file
 */
function downloadMarkdown() {
  downloadFile('amplifier.md', AGENTS_CONTENT);
  toggleExportMenu();
}

/**
 * Download full documentation
 */
function downloadFullGuide() {
  const content = generateFullGuideMarkdown();
  downloadFile('amplifier-completeguide.md', content);
  toggleExportMenu();
}

/**
 * Helper to download a file
 */
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy the code block that a "Copy" button belongs to.
 * Works for .code-block (button in the header) and .example-card layouts.
 */
function copyCode(button) {
  const container = button.closest('.code-block, .example-card') || button.parentElement?.parentElement;
  const code = container ? container.querySelector('pre code, pre') : null;
  if (!code) return;
  navigator.clipboard.writeText(code.textContent).then(() => {
    const original = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = original; }, 1500);
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy', 2000);
  });
}

/**
 * Show the answer for the kernel-vs-module litmus question ('yes' | 'no')
 */
function showLitmusResult(choice) {
  document.querySelectorAll('.litmus-result').forEach(el => el.classList.remove('show'));
  const result = document.getElementById('litmus-result-' + choice);
  if (result) result.classList.add('show');
}

/**
 * Expand or collapse a specification entry
 */
function toggleSpec(header) {
  const section = header.closest('.spec-section');
  if (section) section.classList.toggle('open');
}

// Expose functions globally for onclick handlers
window.toggleExportMenu = toggleExportMenu;
window.copyMarkdown = copyMarkdown;
window.downloadMarkdown = downloadMarkdown;
window.downloadFullGuide = downloadFullGuide;
window.copyCode = copyCode;
window.copyExampleCode = copyCode;
window.showLitmusResult = showLitmusResult;
window.toggleSpec = toggleSpec;

console.log('Export module loaded');
