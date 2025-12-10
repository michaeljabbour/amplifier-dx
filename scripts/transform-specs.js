#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const SPECS_SOURCE = 'specs';
const OUTPUT_FILE = 'generated-specs.html';

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
function transformTable(tableMarkdown) {
  const lines = tableMarkdown.trim().split('\n');
  if (lines.length < 2) return '';

  // Parse header row
  const headers = lines[0].split('|').filter(h => h.trim()).map(h => h.trim());

  // Skip separator row (index 1)
  // Parse data rows
  const rows = lines.slice(2).map(line =>
    line.split('|').filter(c => c.trim()).map(c => c.trim())
  );

  let html = `
        <table class="ref-table">
          <thead>
            <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>`;

  rows.forEach(row => {
    html += `
            <tr>${row.map(cell => `<td>${transformInlineMarkdown(cell)}</td>`).join('')}</tr>`;
  });

  html += `
          </tbody>
        </table>`;

  return html;
}

/**
 * Transform inline markdown (bold, code, links)
 */
function transformInlineMarkdown(text) {
  return text
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}

/**
 * Transform a complete markdown document to HTML
 */
function transformMarkdown(markdown, docTitle) {
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
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
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
      html += transformTable(tableContent);
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
          <p style="margin: 0; color: var(--text-1);">${transformInlineMarkdown(line.slice(2))}</p>
        </div>`;
    }
    // Unordered lists
    else if (line.match(/^[-*]\s/)) {
      const content = line.replace(/^[-*]\s/, '');
      html += `\n        <li>${transformInlineMarkdown(content)}</li>`;
    }
    // Ordered lists
    else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '');
      html += `\n        <li>${transformInlineMarkdown(content)}</li>`;
    }
    // Paragraphs
    else if (line.trim()) {
      html += `\n        <p>${transformInlineMarkdown(line)}</p>`;
    }
  }

  // Close any remaining table
  if (inTable) {
    html += transformTable(tableContent);
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
    const indexHtml = transformMarkdown(indexContent, 'Specifications Index');
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
    const coldStartHtml = transformMarkdown(coldStartContent, 'Cold Start Analysis');
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
        const html = transformMarkdown(content, title);

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
        <!-- Last synced: ${new Date().toISOString()} -->

        <hr style="border: none; border-top: 1px solid var(--border); margin: 32px 0;">

        <div class="info-box" style="border-left: 4px solid var(--purple); margin-bottom: 24px;">
          <strong>External Specifications</strong>
          <p style="margin: 8px 0 0 0; color: var(--text-1);">
            These specifications are automatically synced from
            <a href="https://github.com/samueljklee/amplifier-next-specs" target="_blank">amplifier-next-specs</a>.
            They define enterprise productivity extensions for the Amplifier framework.
          </p>
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

  // Write output
  fs.writeFileSync(OUTPUT_FILE, finalHtml);
  console.log(`Generated ${OUTPUT_FILE} with ${allSpecs.length} specifications`);
}

main();
