// ==========================================================================
// MAIN APPLICATION ENTRY POINT
// ==========================================================================

import { CONFIG } from './config.js';
import { initNavigation } from './navigation.js';
import { getWithBackgroundRefresh, onDataReady } from './github-api.js';
import { renderBell, renderSection } from './updates.js';
import './export.js'; // Export menu functionality (exposes global functions)

/**
 * Initialize mermaid with dark theme
 */
function initMermaid() {
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#4b5563',
        lineColor: '#6b7280',
        secondaryColor: '#1f2937',
        tertiaryColor: '#111827',
        background: '#0f172a',
        mainBkg: '#1e293b',
        nodeBorder: '#4b5563',
        clusterBkg: '#1e293b',
        clusterBorder: '#4b5563',
        titleColor: '#e2e8f0',
        edgeLabelBackground: '#1e293b'
      },
      flowchart: {
        curve: 'basis',
        padding: 20
      },
      securityLevel: 'loose'
    });
  }
}

/**
 * Initialize Prism syntax highlighting
 */
function initPrism() {
  if (typeof Prism !== 'undefined') {
    // Prism is loaded, highlight will happen lazily per section
    console.log('Prism ready');
  }
}

/**
 * Main initialization
 */
async function init() {
  console.log('Amplifier DX initializing...');

  // Initialize mermaid first (before navigation shows sections)
  initMermaid();

  // Initialize Prism
  initPrism();

  // Initialize navigation (handles routing, layout)
  initNavigation();

  // Register data callbacks
  onDataReady((items) => {
    renderBell(items);
    renderSection(items);
  });

  // Load data (uses cache if available, refreshes in background)
  try {
    const items = await getWithBackgroundRefresh();
    renderBell(items);
    renderSection(items);
  } catch (e) {
    console.warn('Failed to load updates:', e);
  }

  console.log('Amplifier DX ready');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
