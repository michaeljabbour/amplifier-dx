#!/usr/bin/env node

/**
 * Render the Ecosystem and Showcase sections of index.html from
 * docs/12-current-ecosystem.md, so the site and the markdown inventory
 * cannot drift apart.
 *
 * Usage: node scripts/render-ecosystem.js
 *
 * Everything between the BEGIN/END GENERATED ECOSYSTEM markers in index.html
 * is replaced. Edit docs/12-current-ecosystem.md, not the generated HTML.
 */

const fs = require('fs');

const INDEX_FILE = 'index.html';
const SOURCE_FILE = 'docs/12-current-ecosystem.md';
const BEGIN = '<!-- BEGIN GENERATED ECOSYSTEM (source: docs/12-current-ecosystem.md; run scripts/render-ecosystem.js) -->';
const END = '<!-- END GENERATED ECOSYSTEM -->';
// Bump when diagram renders change, so browsers drop their cached copies.
const IMAGE_VERSION = '?v=2';

// "## " headings rendered into the Ecosystem section, in source order.
const ECOSYSTEM_HEADINGS = [
  'What Changed Since May 2026',
  'Tier 0: Kernel',
  'Tier 1: Entry Point',
  'Tier 2: Libraries',
  'Tier 3: Applications',
  'Tier 4: Bundles',
  'Tier 5: Runtime Modules',
  'Smart Tools and Skills',
];
// "## " heading rendered into the Showcase section.
const SHOWCASE_HEADING = 'Community';

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function href(url) {
  if (url.startsWith('./')) return 'docs/' + url.slice(2);
  if (url.startsWith('../')) return url.slice(3);
  return url;
}

/** Inline markdown: code spans, links, bold, italics. */
function inline(md) {
  const codes = [];
  let s = md.replace(/`([^`]+)`/g, (_, c) => {
    codes.push('<code>' + escapeHtml(c) + '</code>');
    return '\u0000' + (codes.length - 1) + '\u0000';
  });
  s = escapeHtml(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
    `<img src="${href(url)}${IMAGE_VERSION}" alt="${alt}" style="max-width: 100%; height: auto;">`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const external = /^https?:/.test(url);
    return `<a href="${href(url)}"${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

function splitRow(line) {
  // Split on unescaped pipes that are outside code spans.
  const cells = [];
  let cur = '';
  let inCode = false;
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (const ch of body) {
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) { cells.push(cur.trim()); cur = ''; } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function renderTable(rows, indent) {
  const [head, , ...body] = rows;
  const out = [`${indent}<table class="ref-table">`, `${indent}  <thead>`];
  out.push(`${indent}    <tr>${splitRow(head).map(c => `<th>${inline(c)}</th>`).join('')}</tr>`);
  out.push(`${indent}  </thead>`, `${indent}  <tbody>`);
  for (const row of body) {
    out.push(`${indent}    <tr>${splitRow(row).map(c => `<td>${inline(c)}</td>`).join('')}</tr>`);
  }
  out.push(`${indent}  </tbody>`, `${indent}</table>`);
  return out.join('\n');
}

/** Split the document into { heading: [lines] } keyed by "## " heading. */
function sections(md) {
  const map = {};
  let current = null;
  for (const line of md.split('\n')) {
    const m = /^## (.+)$/.exec(line);
    if (m) { current = m[1].trim(); map[current] = []; continue; }
    if (current) map[current].push(line);
  }
  return map;
}

function renderBody(lines, indent) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim() === '---') { i++; continue; }
    if (line.startsWith('### ')) {
      const text = line.slice(4).trim();
      out.push(`${indent}<h3 id="${slug(text)}">${inline(text)}</h3>`);
      i++;
    } else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      out.push(renderTable(rows, indent));
    } else if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'bash';
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      out.push(
        `${indent}<div class="code-block">\n${indent}  <div class="code-header">\n` +
        `${indent}    <span class="code-lang">${lang}</span>\n` +
        `${indent}    <button class="copy-btn" onclick="copyCode(this)">Copy</button>\n${indent}  </div>\n` +
        `${indent}  <pre><code class="language-${lang}">${escapeHtml(code.join('\n'))}</code></pre>\n${indent}</div>`);
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(\||###|```|---)/.test(lines[i])) para.push(lines[i++].trim());
      out.push(`${indent}<p>${inline(para.join(' '))}</p>`);
    }
  }
  return out.join('\n\n');
}

function reconciledDate(md) {
  const m = /Last reconciled: (\d{4}-\d{2}-\d{2})/.exec(md);
  if (!m) throw new Error(`${SOURCE_FILE}: no "Last reconciled: YYYY-MM-DD" line found`);
  return m[1];
}

function render(md) {
  const map = sections(md);
  const date = reconciledDate(md);
  const I = '      ';
  const need = h => {
    if (!map[h]) throw new Error(`${SOURCE_FILE}: missing "## ${h}" section`);
    return map[h];
  };

  const eco = ECOSYSTEM_HEADINGS.map(h =>
    `${I}<h2 id="${slug(h)}">${inline(h)}</h2>\n\n${renderBody(need(h), I)}`).join('\n\n');

  return `${BEGIN}
    <!-- ECOSYSTEM SECTION -->
    <section id="section-ecosystem" class="section">
      <h1>Ecosystem</h1>
      <p class="section-desc">The kernel, libraries, applications, bundles, runtime modules, and Smart Tools that make up Amplifier today.</p>

      <div class="info-box" style="border-left: 4px solid var(--blue); margin-bottom: 24px;">
        <strong>Last reconciled ${date}</strong>
        <p style="margin: 8px 0 0 0; color: var(--text-1);">Reconciled against the upstream <a href="https://github.com/microsoft/amplifier/blob/main/docs/MODULES.md" target="_blank" rel="noopener">Amplifier Component Catalog</a> and public repository metadata. Listed means public and not archived; it is not a claim about support or stability. Categories are this site's own. The upstream catalog is the source of truth.</p>
      </div>

${eco}
    </section>

    <!-- SHOWCASE SECTION -->
    <section id="section-showcase" class="section">
      <h1>Showcase</h1>
      <p class="section-desc">Applications, bundles, capabilities, and modules built on Amplifier by the community.</p>

      <div class="callout callout-danger">
        <p><strong>Security notice:</strong> Community components execute arbitrary code with your permissions. <strong>Only use sources you trust.</strong> Read the code before installing.</p>
      </div>

${renderBody(need(SHOWCASE_HEADING).filter(l => !/^Community components run arbitrary code/.test(l) && !/^before installing\./.test(l)), I)}

      <h2>Submit Your Project</h2>
      <p>Built something with Amplifier? Share it with the community.</p>
      <ol>
        <li><strong>Build your project</strong> - Follow Amplifier conventions</li>
        <li><strong>Publish to GitHub</strong> - Make the code publicly reviewable</li>
        <li><strong>Test thoroughly</strong> - Check compatibility with current Amplifier versions</li>
        <li><strong>Submit a PR</strong> - Add it to the <a href="https://github.com/microsoft/amplifier/blob/main/docs/MODULES.md" target="_blank" rel="noopener">upstream component catalog</a></li>
      </ol>
    </section>
    ${END}`;
}

function main() {
  const md = fs.readFileSync(SOURCE_FILE, 'utf-8');
  const index = fs.readFileSync(INDEX_FILE, 'utf-8');
  const start = index.indexOf(BEGIN);
  const end = index.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    console.error(`Error: generated-ecosystem markers not found in ${INDEX_FILE}`);
    process.exit(1);
  }
  const updated = index.slice(0, start) + render(md) + index.slice(end + END.length);
  if (updated === index) {
    console.log('index.html ecosystem sections already up to date');
    return;
  }
  fs.writeFileSync(INDEX_FILE, updated);
  console.log('Rendered ecosystem and showcase sections into index.html');
}

main();
