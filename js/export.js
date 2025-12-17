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
 */
const MARKDOWN_CONTENT = `# Amplifier Quick Reference

> The ultra-thin kernel for modular AI agents

## Installation
\`\`\`bash
uv tool install git+https://github.com/microsoft/amplifier@main
amplifier update && amplifier init
export ANTHROPIC_API_KEY="your-key-here"
\`\`\`

## CLI Commands
\`\`\`bash
amplifier                          # Interactive chat
amplifier run "prompt"             # Single command
amplifier run --profile dev "..."  # With profile
amplifier continue                 # Resume session
amplifier session list             # List sessions
amplifier profile list             # List profiles
\`\`\`

## Profiles
- \`foundation\` - LLM only | \`base\` - + filesystem/bash | \`dev\` - Full tools | \`full\` - Everything

## Agents
Use \`@agent-name\` in chat: \`explorer\`, \`bug-hunter\`, \`zen-architect\`, \`researcher\`, \`modular-builder\`

---
*See AGENTS.md export for comprehensive documentation*
`;

/**
 * Comprehensive AGENTS.md / CLAUDE.md content for AI assistants
 */
const AGENTS_CONTENT = `# AGENTS.md - Amplifier Framework Guide

> For AI assistants working with Amplifier codebases

## What is Amplifier?

Amplifier is Microsoft's open-source **AI agent orchestration framework** that composes modular pieces through configuration files called **profiles**. Think of it as Linux for AI agents: a tiny kernel (~2,600 lines) provides mechanisms, while policies live as swappable modules.

**One-sentence definition:** *"A framework for building AI coding assistants by composing providers, tools, and hooks through YAML profiles."*

---

## Quick Start Commands

\`\`\`bash
# Installation
uv tool install git+https://github.com/microsoft/amplifier@main
amplifier update
amplifier init
export ANTHROPIC_API_KEY="your-key-here"

# Running
amplifier                           # Interactive mode
amplifier run "Your prompt"         # Single command
amplifier run --profile dev "..."   # With specific profile
amplifier continue                  # Resume last session

# Management
amplifier session list              # View all sessions
amplifier profile list              # View available profiles
amplifier agents list               # View available agents
\`\`\`

---

## Architecture: Three Layers

Understanding where code belongs is critical:

\`\`\`
APPLICATION LAYER (amplifier-app-cli, amplifier-desktop)
├── Policy decisions (what to do)
├── UX systems (how to present)
├── Settings persistence
└── Module resolution policy

KERNEL LAYER (amplifier-core - single implementation)
├── Session lifecycle management
├── Module coordination
├── Hook dispatch
├── Config validation
└── ~2,600 lines, stable API

MODULE LAYER (amplifier-module-* - many implementations)
├── Providers (talk to LLMs)
├── Tools (execute actions)
├── Hooks (observe/intercept events)
├── Orchestrators (control flow)
└── Contexts (manage conversation state)
\`\`\`

### Key Insight: Core vs Foundation vs CLI

| Package | Purpose | When to Modify |
|---------|---------|----------------|
| \`amplifier-core\` | Kernel mechanisms | Rarely - stable contracts |
| \`amplifier-foundation\` | Profiles, bundles, best practices | For team customizations |
| \`amplifier-app-cli\` | CLI application | UI/UX changes only |
| \`amplifier-module-*\` | Individual capabilities | Most extension work here |

---

## The Five Components

Every Amplifier session uses exactly five component types:

| Component | Protocol Method | Purpose | Example |
|-----------|-----------------|---------|---------|
| **Provider** | \`complete(messages)\` | Call LLMs | \`provider-anthropic\` |
| **Tool** | \`execute(input) -> ToolResult\` | Run actions | \`tool-filesystem\`, \`tool-bash\` |
| **Context** | \`get_messages()\`, \`add_message()\` | Store conversation | \`context-simple\` |
| **Orchestrator** | \`execute()\` | Run think/act loop | \`loop-streaming\` |
| **Hook** | \`on_event(event, data) -> HookResult\` | Observe/block | \`hooks-approval\` |

### HookResult Actions

Hooks are the security boundary. They can return:

- \`continue\` - Proceed normally (default)
- \`deny\` - Block operation with reason message
- \`modify\` - Alter event data before processing
- \`inject_context\` - Add message to context
- \`ask_user\` - Pause for user approval

---

## Configuration System

Settings merge deterministically (more specific wins):

\`\`\`
defaults
  ↓
~/.amplifier/settings.yaml         (user-level)
  ↓
.amplifier/settings.yaml           (project-level)
  ↓
.amplifier/settings.local.yaml     (local/gitignored)
  ↓
runtime arguments
\`\`\`

### Profile Structure

\`\`\`yaml
---
name: my-profile
version: "1.0"
extends: coding-base          # Optional inheritance
providers:
  - module: provider-anthropic
tools:
  - module: tool-filesystem
  - module: tool-bash
hooks:
  - module: hooks-logging
---

You are a senior software engineer working on...
(System prompt in markdown body)
\`\`\`

### Built-in Profiles

| Profile | Capabilities |
|---------|-------------|
| \`foundation\` | LLM access only, no tools |
| \`base\` | + filesystem and bash |
| \`dev\` | Full development tools |
| \`test\` | Testing-focused configuration |
| \`full\` | All features enabled |

---

## Module System

### Two-Tier Distribution

| Tier | Module Types | Location | Loading |
|------|-------------|----------|---------|
| **Bundled** | Providers | Python entry points | Direct import |
| **Cached** | All types | \`~/.amplifier/module-cache/\` | Via resolution package |

### Module Loading Priority

1. Local modules (custom \`LocalLoader\`)
2. Module cache (\`amplifier_module_resolution\`)
3. Entry points (bundled providers)

### Writing Custom Modules

\`\`\`python
# Custom Tool Example
from amplifier_core import Tool, ToolResult

class MyTool(Tool):
    name = "my-tool"
    description = "Does something useful"

    async def execute(self, input: dict) -> ToolResult:
        # Your implementation
        return ToolResult(output="Success")
\`\`\`

---

## Event Stream (Guaranteed Order)

Every operation emits ordered events:

\`\`\`
session:start
├── prompt:submit
│   ├── provider:request
│   ├── provider:response
│   ├── tool:pre          ← Hooks can DENY here
│   ├── [tool executes]
│   ├── tool:post
│   └── [loop or exit]
├── prompt:complete
└── session:end
\`\`\`

---

## Guarantees (Build On These)

1. **Hooks Always Fire** - No tool bypasses hooks
2. **Events Are Ordered** - Deterministic sequence
3. **Context Is Append-Only** - Messages never silently dropped
4. **Tools Are Isolated** - Can't see other tools' state
5. **Provider Responses Immutable** - What LLM says, stays
6. **Config Hierarchy Deterministic** - Specific always wins
7. **Hooks Can Block, Tools Cannot** - Security in hooks

---

## Development Tips

### Finding Things
\`\`\`bash
# Jump to a module
amplifier module show <name>

# Find profile location
amplifier profile show <name> --path

# Check loaded modules
amplifier debug modules
\`\`\`

### Testing
\`\`\`bash
# Run with verbose logging
amplifier run --verbose "..."

# Test specific profile
amplifier run --profile test "..."

# Debug hooks
AMPLIFIER_DEBUG=hooks amplifier run "..."
\`\`\`

### Common Patterns

**Adding a tool to a profile:**
\`\`\`yaml
tools:
  - module: tool-filesystem
  - module: tool-bash
  - module: my-custom-tool    # Add here
\`\`\`

**Creating a project profile:**
\`\`\`bash
mkdir -p .amplifier/profiles
# Create .amplifier/profiles/team.yaml
\`\`\`

**Blocking dangerous operations:**
\`\`\`yaml
hooks:
  - module: hooks-approval
    config:
      require_approval: ["tool-bash"]
\`\`\`

---

## Extension System

### Skills (Model-Invoked)
- Location: \`~/.amplifier/skills/\` or \`.amplifier/skills/\`
- Format: \`SKILL.md\` with YAML frontmatter
- Claude decides when to invoke them

### Agents (User-Invoked)
- Activated via \`@agent-name\` in chat
- Can override model, temperature, tools
- Built-in: \`explorer\`, \`bug-hunter\`, \`zen-architect\`, \`researcher\`, \`modular-builder\`

### Plugins
- MCP servers (Model Context Protocol)
- API integrations
- Custom tool implementations

---

## Programmatic Usage (Embedding)

\`\`\`python
from amplifier_core import Coordinator, Config

# From profile
config = Config.from_profile("my-profile")

# Or manual configuration
config = Config(
    providers=[{"module": "provider-anthropic"}],
    tools=[{"module": "tool-filesystem"}],
    hooks=[{"module": "hooks-logging"}]
)

coordinator = Coordinator(config)

async with coordinator.session() as session:
    response = await session.run("Your prompt here")
    print(response.content)
\`\`\`

---

## Key Repositories

| Repository | Purpose |
|------------|---------|
| \`amplifier-core\` | Kernel - session coordination, protocols |
| \`amplifier-profiles\` | Profile loading with inheritance |
| \`amplifier-module-resolution\` | Module source resolution |
| \`amplifier-collections\` | Collection discovery |
| \`amplifier-app-cli\` | CLI application |
| \`amplifier-foundation\` | Bundles and best practices |

---

## Documentation Navigation

This documentation site has these sections:

| Section | Content |
|---------|---------|
| **Home** | Overview and quick links |
| **Quickstart** | Installation and first steps |
| **Architecture** | Three-layer design, data flow, protocols |
| **Guides** | Architecture boundaries, module development |
| **Reference** | API details, configuration options |
| **CLI** | Command reference |
| **Ecosystem** | Skills, agents, plugins |
| **Examples** | Code samples and patterns |

---

## Rules for Working with Amplifier Code

1. **Check the layer** - Know if you're in app/kernel/module before editing
2. **Respect boundaries** - Kernel doesn't make policy decisions
3. **Hooks for security** - Never bypass hook dispatch
4. **Profiles for config** - Don't hardcode what should be configurable
5. **Test with profiles** - Use \`--profile test\` for CI
6. **Inherit, don't duplicate** - Use \`extends:\` in profiles

---

## Common Mistakes to Avoid

- Adding policy logic to \`amplifier-core\` (belongs in app layer)
- Bypassing hooks in custom tools (security violation)
- Hardcoding provider/model in tools (use config)
- Creating new orchestrators when a hook would suffice
- Putting secrets in profiles (use environment variables)

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
    { id: 'guides', title: 'Guides' },
    { id: 'reference', title: 'Reference' },
    { id: 'cli', title: 'CLI Commands' },
    { id: 'ecosystem', title: 'Ecosystem' },
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

// Expose functions globally for onclick handlers
window.toggleExportMenu = toggleExportMenu;
window.copyMarkdown = copyMarkdown;
window.downloadMarkdown = downloadMarkdown;
window.downloadFullGuide = downloadFullGuide;

console.log('Export module loaded');
