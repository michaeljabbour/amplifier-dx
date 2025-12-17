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
 * Quick reference markdown content
 */
const MARKDOWN_CONTENT = `# Amplifier

> The ultra-thin kernel for modular AI agents

Amplifier is an open-source AI agent orchestration system from Microsoft built on Linux-kernel philosophy: a tiny, stable center (~2,600 lines) that provides mechanisms, while policies live as swappable modules at the edges.

## Quick Reference

- **Repository**: https://github.com/microsoft/amplifier
- **Core Kernel**: https://github.com/microsoft/amplifier-core
- **License**: MIT
- **Core Size**: ~2,600 lines
- **Design Philosophy**: Mechanism over policy

## Installation

\`\`\`bash
uv tool install git+https://github.com/microsoft/amplifier@main
amplifier update
amplifier init
\`\`\`

## Basic Usage

\`\`\`bash
# Set API key
export ANTHROPIC_API_KEY="your-key-here"

# Interactive mode
amplifier

# Single command
amplifier run "Your prompt here"

# With profile
amplifier run --profile dev "Your prompt"

# Resume last session
amplifier continue "follow-up prompt"
\`\`\`

## CLI Commands

### Running
- \`amplifier\` - Interactive chat mode
- \`amplifier run "prompt"\` - Single command
- \`amplifier run --profile name\` - With specific profile
- \`amplifier continue\` - Resume last session

### Sessions
- \`amplifier session list\` - Display all sessions
- \`amplifier session show [id]\` - View details
- \`amplifier session resume [id]\` - Resume specific
- \`amplifier session delete [id]\` - Remove session

### Profiles
- \`amplifier profile list\` - View all profiles
- \`amplifier profile use dev\` - Set default
- \`amplifier profile show name\` - Display config

### Agents
- \`amplifier agents list\` - List available
- \`amplifier agents show [name]\` - View details
- Use \`@agent-name\` in interactive mode

## Profiles

Built-in profiles:
- \`foundation\` - Minimal LLM access only
- \`base\` - Filesystem and bash capabilities
- \`dev\` - Complete development tools
- \`test\` - Testing-focused configuration
- \`full\` - All features enabled

## Built-in Agents

- \`explorer\` - Breadth-first codebase exploration
- \`bug-hunter\` - Systematic debugging
- \`zen-architect\` - System design
- \`researcher\` - Research and synthesis
- \`modular-builder\` - Code implementation

## Core Protocols

- **Provider**: LLM backend (\`complete\`, \`stream\`)
- **Tool**: Agent capability (\`name\`, \`description\`, \`execute\`)
- **Hook**: Observability (\`handler(event, data) -> HookResult\`)
- **Orchestrator**: Execution loop (\`run\`)
- **ContextManager**: Memory (\`add\`, \`get_messages\`)

## HookResult Actions

- \`continue\` - Proceed normally (default)
- \`deny\` - Block operation with reason
- \`modify\` - Alter event data
- \`inject_context\` - Add message to context
- \`ask_user\` - Pause for approval

## Programmatic Usage

\`\`\`python
from amplifier_core import AmplifierSession

config = {
    "session": {"orchestrator": "loop-basic", "context": "context-simple"},
    "providers": [{"module": "provider-anthropic"}],
    "tools": [{"module": "tool-filesystem"}, {"module": "tool-bash"}],
    "hooks": [{"module": "hooks-logging"}]
}

async with AmplifierSession(config) as session:
    response = await session.execute("Your prompt")
\`\`\`

---
*Generated from Amplifier DX Documentation*
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
 * Copy markdown to clipboard
 */
function copyMarkdown() {
  navigator.clipboard.writeText(MARKDOWN_CONTENT).then(() => {
    alert('Markdown copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy to clipboard. Please try downloading instead.');
  });
  toggleExportMenu();
}

/**
 * Download quick reference markdown
 */
function downloadMarkdown() {
  downloadFile('amplifier.md', MARKDOWN_CONTENT);
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
