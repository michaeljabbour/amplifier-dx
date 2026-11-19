#!/usr/bin/env node

/**
 * Extract site context from index.html for GPT chat widget
 * Outputs a clean text representation of all documentation content
 */

const fs = require('fs');
const path = require('path');

const INDEX_FILE = 'index.html';
const OUTPUT_DIR = process.env.CONTEXT_OUTPUT_DIR || 'context';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'site-context.txt');

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html) {
  return html
    // Remove script and style content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Convert common elements to text markers
    .replace(/<h1[^>]*>/gi, '\n# ')
    .replace(/<h2[^>]*>/gi, '\n## ')
    .replace(/<h3[^>]*>/gi, '\n### ')
    .replace(/<h4[^>]*>/gi, '\n#### ')
    .replace(/<\/h[1-4]>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<td[^>]*>/gi, ' | ')
    .replace(/<th[^>]*>/gi, ' | ')
    // Preserve code blocks
    .replace(/<code[^>]*>/gi, '`')
    .replace(/<\/code>/gi, '`')
    .replace(/<pre[^>]*>/gi, '\n```\n')
    .replace(/<\/pre>/gi, '\n```\n')
    // Remove remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    // Strip trailing spaces/tabs on each line (leading indentation untouched)
    .replace(/[ \t]+$/gm, '')
    .trim();
}

/**
 * Find the full HTML of a <section id="..."> element, balancing nested
 * <section> tags. Returns the inner HTML, or '' if not found.
 */
function findSectionInner(html, sectionId) {
  const open = new RegExp(`<section[^>]*id="${sectionId}"[^>]*>`, 'i').exec(html);
  if (!open) return '';
  const start = open.index + open[0].length;
  const tag = /<(\/?)section\b[^>]*>/gi;
  tag.lastIndex = start;
  let depth = 1;
  let m;
  while ((m = tag.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  return '';
}

/**
 * Historical Proposals tab (contribute > Specifications). It holds proposed
 * future designs and a generated external spec corpus, not installed facts.
 * The block runs from its tab div to the start of the next tab (Roadmap).
 * It stays on the website; it is only left out of the chat context.
 */
const HISTORICAL_TAB_START = '<div id="contrib-specs"';
const HISTORICAL_TAB_END = '<div id="contrib-roadmap"';
const HISTORICAL_POINTER =
  '<p>The Specifications tab (Contribute section) holds historical proposals ' +
  'and generated specs for possible future designs. It is not part of this ' +
  'context and does not describe the installed system. Point users to ' +
  'Contribute > Specifications on the site to read it.</p>';

function excludeHistoricalTab(sectionHtml) {
  const start = sectionHtml.indexOf(HISTORICAL_TAB_START);
  const end = sectionHtml.indexOf(HISTORICAL_TAB_END);
  if (start === -1 || end === -1 || end < start) {
    console.error('Error: could not locate Historical Proposals tab boundaries');
    process.exit(1);
  }
  return sectionHtml.slice(0, start) + HISTORICAL_POINTER + sectionHtml.slice(end);
}

/**
 * Extract content from a specific section
 */
function extractSection(html, sectionId) {
  let inner = findSectionInner(html, sectionId);
  if (!inner) return '';
  if (sectionId === 'section-contribute') inner = excludeHistoricalTab(inner);
  return stripHtml(inner);
}

/**
 * Main extraction function
 */
function main() {
  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`Error: ${INDEX_FILE} not found`);
    process.exit(1);
  }

  const html = fs.readFileSync(INDEX_FILE, 'utf-8');

  // Define sections to extract
  const sections = [
    { id: 'section-home', title: 'Home' },
    { id: 'section-quickstart', title: 'Quickstart' },
    { id: 'section-architecture', title: 'Architecture' },
    { id: 'section-reference', title: 'API Reference' },
    { id: 'section-cli', title: 'CLI Commands' },
    { id: 'section-ecosystem', title: 'Ecosystem' },
    { id: 'section-showcase', title: 'Showcase' },
    { id: 'section-examples', title: 'Code Examples' },
    { id: 'section-philosophy', title: 'Philosophy' },
    { id: 'section-guides', title: 'Guides' },
    { id: 'section-contribute', title: 'Contribute' },
  ];

  let output = `AMPLIFIER DOCUMENTATION
========================

Amplifier is the ultra-thin kernel for modular AI agents from Microsoft.
This context contains the complete documentation for building AI agent systems.

`;

  // Extract each section
  for (const section of sections) {
    const content = extractSection(html, section.id);
    if (content) {
      output += `\n${'='.repeat(60)}\n`;
      output += `SECTION: ${section.title.toUpperCase()}\n`;
      output += `${'='.repeat(60)}\n\n`;
      output += content;
      output += '\n';
    }
  }

  // Add footer with metadata
  output += `\n${'='.repeat(60)}\n`;
  output += `END OF DOCUMENTATION\n`;
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Source: https://michaeljabbour.github.io/amplifier-dx/\n`;

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, output);

  // Calculate stats
  const charCount = output.length;
  const wordCount = output.split(/\s+/).length;
  const estimatedTokens = Math.ceil(wordCount * 1.3); // Rough estimate

  console.log(`Generated ${OUTPUT_FILE}`);
  console.log(`  Characters: ${charCount.toLocaleString()}`);
  console.log(`  Words: ${wordCount.toLocaleString()}`);
  console.log(`  Estimated tokens: ~${estimatedTokens.toLocaleString()}`);
}

main();
