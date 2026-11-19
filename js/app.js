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
        // Matches css/theme.css (graphite panel, bone lettering)
        primaryColor: '#2e3033',
        primaryTextColor: '#efeadf',
        primaryBorderColor: '#4a4d51',
        lineColor: '#9b968b',
        secondaryColor: '#232527',
        tertiaryColor: '#1a1b1d',
        background: '#151618',
        mainBkg: '#232527',
        nodeBorder: '#4a4d51',
        clusterBkg: '#1a1b1d',
        clusterBorder: '#323437',
        titleColor: '#efeadf',
        edgeLabelBackground: '#151618',
        fontFamily: 'Archivo, Helvetica Neue, Arial, sans-serif'
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
