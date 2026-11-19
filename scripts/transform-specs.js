#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Configuration
const SPECS_SOURCE = 'specs';
const OUTPUT_FILE = 'generated-specs.html';
const SPECS_REPO = 'https://github.com/samueljklee/amplifier-next-specs';

const SPEC_DIRECTORIES = [
  'design',
  'tools',
  'hooks',
  'recipes',
  'collections',
  'integrations',
  'contexts',
  'orchestrators',
  'scenario-tools'
];

// Language mapping for code blocks
const LANG_MAP = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'sh': 'bash',
  'yml': 'yaml',
  '': 'text'
};

/**
 * Resolve the exact specs revision these pages are generated from: SPECS_REV
 * override, else the checked-out submodule HEAD (the content actually read),
 * else the gitlink recorded in this repo. Returns null if none is available.
 */
function resolveSpecsRevision() {
  const attempts = [
    () => process.env.SPECS_REV,
    () => execFileSync('git', ['-C', SPECS_SOURCE, 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString(),
    () => execFileSync('git', ['ls-tree', 'HEAD', SPECS_SOURCE], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split(/\s+/)[2]
  ];
  for (const attempt of attempts) {
    try {
      const rev = (attempt() || '').trim();
      if (/^[0-9a-f]{40}$/.test(rev)) return rev;
    } catch (e) { /* try next source */ }
  }
  return null;
}

const SPECS_REV = resolveSpecsRevision();

/**
 * Turn a link found in a spec into an href. Relative links are relative to the
 * source markdown file, not the site root, so resolve them against that file and
 * point at the pinned revision on GitHub. Returns null when the target does not
 * exist in the specs tree (or no revision is known): render text, not a dead link.
 */
function resolveSpecLink(href, sourceFile) {
  if (/^(https?:|mailto:)/i.test(href)) return href;
  if (!sourceFile || !SPECS_REV || href.startsWith('#') || href.startsWith('/')) return null;
  const [target, ...frag] = href.split('#');
  const rel = path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), target));
  if (rel.startsWith('..') || !fs.existsSync(path.join(SPECS_SOURCE, rel))) return null;
  const kind = fs.statSync(path.join(SPECS_SOURCE, rel)).isDirectory() ? 'tree' : 'blob';
  return `${SPECS_REPO}/${kind}/${SPECS_REV}/${rel}${frag.length ? '#' + frag.join('#') : ''}`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert markdown code blocks to HTML matching site style
 */
function transformCodeBlock(code, language) {
  const lang = LANG_MAP[language] || language || 'text';
  const escapedCode = escapeHtml(code.trim());

  return `
        <div class="code-block">
          <div class="code-header">
            <span class="code-lang">${lang}</span>
            <button class="copy-btn" onclick="copyCode(this)">Copy</button>
          </div>
          <pre><code class="language-${lang}">${escapedCode}</code></pre>
        </div>`;
}

/**
 * Convert markdown tables to HTML ref-table style
 */
function transformTable(tableMarkdown, sourceFile) {
  const lines = tableMarkdown.trim().split('\n');
  if (lines.length < 2) return '';

  // Parse header row
  // Drop only the outer pipes so empty interior/trailing cells keep their column
  const splitRow = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const headers = splitRow(lines[0]);

  // Skip separator row (index 1)
  // Parse data rows
  const rows = lines.slice(2).map(splitRow);

  let html = `
        <table class="ref-table">
          <thead>
            <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>`;

  rows.forEach(row => {
    html += `
            <tr>${row.map(cell => `<td>${transformInlineMarkdown(cell, sourceFile)}</td>`).join('')}</tr>`;
  });

  html += `
          </tbody>
        </table>`;

  return html;
}

/**
 * Transform inline markdown (bold, code, links)
 */
function transformInlineMarkdown(text, sourceFile) {
  return text
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, href) => {
      const url = resolveSpecLink(href.trim(), sourceFile);
      return url ? `<a href="${url}" target="_blank" rel="noopener">${label}</a>` : label;
    });
}

/**
 * Transform a complete markdown document to HTML
 */
function transformMarkdown(markdown, docTitle, sourceFile) {
  let html = '';
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLang = '';
  let inTable = false;
  let tableContent = '';

  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block handling
    if (line.trimStart().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.trimStart().slice(3).trim();
        codeBlockContent = '';
      } else {
        html += transformCodeBlock(codeBlockContent, codeBlockLang);
        inCodeBlock = false;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += (codeBlockContent ? '\n' : '') + line;
      continue;
    }

    // Table handling
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableContent = line + '\n';
      } else {
        tableContent += line + '\n';
      }
      continue;
    } else if (inTable) {
      html += transformTable(tableContent, sourceFile);
      inTable = false;
      tableContent = '';
    }

    // Headers
    if (line.startsWith('# ')) {
      // Skip H1 - we use the section title
      continue;
    } else if (line.startsWith('## ')) {
      html += `\n        <h3>${escapeHtml(line.slice(3))}</h3>`;
    } else if (line.startsWith('### ')) {
      html += `\n        <h4 style="color: var(--text-1); font-size: 14px; margin: 16px 0 8px;">${escapeHtml(line.slice(4))}</h4>`;
    }
    // Blockquotes become callouts
    else if (line.startsWith('> ')) {
      html += `
        <div class="info-box" style="border-left: 4px solid var(--accent);">
          <p style="margin: 0; color: var(--text-1);">${transformInlineMarkdown(line.slice(2), sourceFile)}</p>
        </div>`;
    }
    // Unordered lists
    else if (line.match(/^[-*]\s/)) {
      const content = line.replace(/^[-*]\s/, '');
      html += `\n        <li>${transformInlineMarkdown(content, sourceFile)}</li>`;
    }
    // Ordered lists
    else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '');
      html += `\n        <li>${transformInlineMarkdown(content, sourceFile)}</li>`;
    }
    // Paragraphs
    else if (line.trim()) {
      html += `\n        <p>${transformInlineMarkdown(line, sourceFile)}</p>`;
    }
  }

  // Close anything still open at EOF so trailing content is not dropped
  if (inCodeBlock) {
    html += transformCodeBlock(codeBlockContent, codeBlockLang);
  }
  if (inTable) {
    html += transformTable(tableContent, sourceFile);
  }

  return html;
}

/**
 * Create a collapsible spec section
 */
function createSpecSection(title, content, category) {
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `
        <div class="spec-section" id="spec-${sectionId}" data-category="${category}">
          <div class="spec-header" onclick="toggleSpec(this)">
            <span class="spec-title">${escapeHtml(title)}</span>
            <span class="spec-category">${escapeHtml(category)}</span>
            <svg class="spec-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <div class="spec-content">
            ${content}
          </div>
        </div>`;
}

/**
 * Main transformation function
 */
function main() {
  let allSpecs = [];

  // Process INDEX.md
  const indexPath = path.join(SPECS_SOURCE, 'INDEX.md');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const indexHtml = transformMarkdown(indexContent, 'Specifications Index', 'INDEX.md');
    allSpecs.push({
      title: 'Enterprise Productivity Extensions Index',
      category: 'overview',
      html: indexHtml,
      priority: 0
    });
  }

  // Process COLD_START_ANALYSIS.md
  const coldStartPath = path.join(SPECS_SOURCE, 'COLD_START_ANALYSIS.md');
  if (fs.existsSync(coldStartPath)) {
    const coldStartContent = fs.readFileSync(coldStartPath, 'utf-8');
    const coldStartHtml = transformMarkdown(coldStartContent, 'Cold Start Analysis', 'COLD_START_ANALYSIS.md');
    allSpecs.push({
      title: 'Cold Start Analysis',
      category: 'analysis',
      html: coldStartHtml,
      priority: 1
    });
  }

  // Process each spec directory
  SPEC_DIRECTORIES.forEach((dir, dirIndex) => {
    const dirPath = path.join(SPECS_SOURCE, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));

      files.forEach((file, fileIndex) => {
        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const title = file.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const html = transformMarkdown(content, title, `${dir}/${file}`);

        allSpecs.push({
          title: title,
          category: dir,
          html: html,
          priority: (dirIndex + 2) * 100 + fileIndex
        });
      });
    }
  });

  // Sort by priority
  allSpecs.sort((a, b) => a.priority - b.priority);

  // Generate final HTML
  let finalHtml = `
        <!-- AUTO-GENERATED: External Specifications from amplifier-next-specs -->
        <!-- Source: ${SPECS_REPO} @ ${SPECS_REV || 'unknown'} -->

        <hr style="border: none; border-top: 1px solid var(--border); margin: 32px 0;">

        <div class="info-box" style="border-left: 4px solid var(--purple); margin-bottom: 24px;">
          <strong>External Specifications</strong>
          <p style="margin: 8px 0 0 0; color: var(--text-1);">
            These specifications are automatically synced from
            <a href="https://github.com/samueljklee/amplifier-next-specs" target="_blank">amplifier-next-specs</a>.
            They define enterprise productivity extensions for the Amplifier framework.
            Source revision: ${SPECS_REV ? `<a href="${SPECS_REPO}/tree/${SPECS_REV}" target="_blank" rel="noopener"><code>${SPECS_REV.slice(0, 7)}</code></a>` : '<code>unknown</code>'}.
            Links inside these specs point to that pinned revision on GitHub; files that do not exist there are shown as plain text.
          </p>
        </div>

        <div class="callout callout-danger">
          <p><strong>Historical proposals, not current reference.</strong> These specifications were written in December 2025, before bundles replaced profiles and collections. Commands, flags, keys and model names in them (<code>amplifier profile</code>, <code>amplifier collection</code>, <code>--profile</code>, <code>extends:</code>) do not exist in current Amplifier. Read "profile" and "collection" as "bundle", and use the CLI, Reference and Ecosystem sections of this site for what works today.</p>
        </div>

        <div class="spec-filter" style="margin-bottom: 20px;">
          <span style="font-size: 13px; color: var(--text-2); margin-right: 12px;">Filter:</span>
          <button class="spec-filter-btn active" data-filter="all">All</button>
          <button class="spec-filter-btn" data-filter="design">Design</button>
          <button class="spec-filter-btn" data-filter="tools">Tools</button>
          <button class="spec-filter-btn" data-filter="hooks">Hooks</button>
          <button class="spec-filter-btn" data-filter="recipes">Recipes</button>
          <button class="spec-filter-btn" data-filter="collections">Collections</button>
          <button class="spec-filter-btn" data-filter="integrations">Integrations</button>
        </div>

        <div id="specs-container">`;

  allSpecs.forEach(spec => {
    finalHtml += createSpecSection(spec.title, spec.html, spec.category);
  });

  finalHtml += `
        </div>
        <!-- END AUTO-GENERATED -->`;

  if (!SPECS_REV) {
    console.warn('Warning: could not determine specs revision; spec links will render as plain text');
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, finalHtml);
  console.log(`Generated ${OUTPUT_FILE} with ${allSpecs.length} specifications`);
}

main();
