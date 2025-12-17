// ==========================================================================
// NAVIGATION WITH CACHED DOM REFS
// ==========================================================================

import { CONFIG } from './config.js';

// Cached DOM references
let domCache = null;

/**
 * Initialize DOM cache
 */
function initDomCache() {
  if (domCache) return;

  domCache = {
    body: document.body,
    sidebar: document.querySelector('.sidebar'),
    navItems: document.querySelectorAll('.nav-item, .sub-nav-item, .sidebar-item, .sidebar-subitem'),
    sections: {},
    layoutToggles: document.querySelectorAll('.layout-toggle-btn')
  };

  // Cache section elements (IDs are prefixed with 'section-')
  CONFIG.sections.forEach(id => {
    domCache.sections[id] = document.getElementById('section-' + id);
  });
}

/**
 * Set layout mode (sidebar or top)
 * @param {string} mode - 'sidebar' or 'top'
 */
export function setLayout(mode) {
  initDomCache();
  domCache.body.className = '';
  domCache.body.classList.add('layout-' + mode);
  localStorage.setItem('preferredLayout', mode);

  // Update toggle button states
  domCache.layoutToggles.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layout === mode);
  });
}

/**
 * Show a section, hide others
 * @param {string} id - Section ID to show
 */
export function showSection(id) {
  initDomCache();

  // Validate section
  if (!CONFIG.sections.includes(id)) {
    console.warn(`Invalid section: ${id}`);
    id = 'home';
  }

  // Hide all sections, show target
  CONFIG.sections.forEach(sectionId => {
    const section = domCache.sections[sectionId];
    if (section) {
      section.style.display = sectionId === id ? 'block' : 'none';
    }
  });

  // Update nav active state
  domCache.navItems.forEach(item => {
    const isActive = item.dataset.section === id;
    item.classList.toggle('active', isActive);
  });

  // Update URL hash
  if (window.location.hash !== '#' + id) {
    history.pushState(null, '', '#' + id);
  }

  // Lazy Prism highlight for visible section only
  const section = domCache.sections[id];
  if (section && typeof Prism !== 'undefined') {
    const codeBlocks = section.querySelectorAll('pre code:not(.prism-highlighted)');
    codeBlocks.forEach(block => {
      Prism.highlightElement(block);
      block.classList.add('prism-highlighted');
    });
  }

  // Initialize mermaid diagrams in this section
  if (section && typeof mermaid !== 'undefined') {
    const diagrams = section.querySelectorAll('.mermaid:not([data-processed])');
    if (diagrams.length > 0) {
      mermaid.init(undefined, diagrams);
    }
  }
}

/**
 * Handle hash change for routing
 */
function handleHash() {
  const hash = window.location.hash.slice(1) || 'home';
  showSection(hash);
}

/**
 * Initialize navigation
 */
export function initNavigation() {
  initDomCache();

  // Restore layout preference
  const savedLayout = localStorage.getItem('preferredLayout') || 'sidebar';
  setLayout(savedLayout);

  // Delegated click handler for nav items
  document.addEventListener('click', (e) => {
    // Nav item clicks (handles all nav variants)
    const navItem = e.target.closest('.nav-item, .sub-nav-item, .sidebar-item, .sidebar-subitem, [data-section]');
    if (navItem && navItem.dataset.section) {
      e.preventDefault();
      showSection(navItem.dataset.section);

      // Handle scroll-to-target for subitems with data-scroll attribute
      if (navItem.dataset.scroll) {
        setTimeout(() => {
          const target = document.getElementById(navItem.dataset.scroll);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
      return;
    }

    // Layout toggle clicks
    const layoutBtn = e.target.closest('.layout-toggle-btn');
    if (layoutBtn && layoutBtn.dataset.layout) {
      setLayout(layoutBtn.dataset.layout);
      return;
    }
  });

  // Handle hash changes
  window.addEventListener('hashchange', handleHash);

  // Initial section from hash
  handleHash();
}

/**
 * Get cached DOM element
 * @param {string} key - Cache key
 * @returns {Element|null}
 */
export function getDom(key) {
  initDomCache();
  return domCache[key] || domCache.sections[key];
}

// ==========================================================================
// SIDEBAR TOGGLE FUNCTIONS (exposed globally for onclick handlers)
// ==========================================================================

let sidebarExpanded = true;

/**
 * Toggle sidebar group (collapse/expand)
 */
function toggleSidebarGroup(el) {
  el.classList.toggle('open');
  el.nextElementSibling.classList.toggle('show');
}

/**
 * Toggle sidebar item with subitems
 */
function toggleSidebarItem(el) {
  el.classList.toggle('open');
  const subitems = el.nextElementSibling;
  if (subitems) subitems.classList.toggle('show');
  // Also navigate to the section
  const sectionId = el.dataset.section;
  if (sectionId) showSection(sectionId);
}

/**
 * Toggle all sidebar groups
 */
function toggleAllSidebar() {
  const toggleBtn = document.querySelector('.sidebar-toggle-all');
  const toggleText = document.getElementById('toggle-all-text');

  if (sidebarExpanded) {
    // Collapse all
    document.querySelectorAll('.sidebar-header').forEach(el => {
      el.classList.remove('open');
      el.nextElementSibling.classList.remove('show');
    });
    document.querySelectorAll('.sidebar-item.has-children').forEach(el => {
      el.classList.remove('open');
      const subitems = el.nextElementSibling;
      if (subitems) subitems.classList.remove('show');
    });
    toggleBtn.classList.add('collapsed');
    toggleText.textContent = 'Expand All';
  } else {
    // Expand all
    document.querySelectorAll('.sidebar-header').forEach(el => {
      el.classList.add('open');
      el.nextElementSibling.classList.add('show');
    });
    document.querySelectorAll('.sidebar-item.has-children').forEach(el => {
      el.classList.add('open');
      const subitems = el.nextElementSibling;
      if (subitems) subitems.classList.add('show');
    });
    toggleBtn.classList.remove('collapsed');
    toggleText.textContent = 'Collapse All';
  }
  sidebarExpanded = !sidebarExpanded;
}

/**
 * Navigate to section and activate a specific tab
 */
export function showSectionWithTab(sectionId, tabId) {
  showSection(sectionId);
  // Activate the tab
  setTimeout(() => {
    const tabsContainer = document.querySelector(`#section-${sectionId} .tabs, #${sectionId}-tabs`);
    if (tabsContainer) {
      const tab = tabsContainer.querySelector(`[data-tab="${tabId}"]`);
      if (tab) tab.click();
    }
  }, 50);
}

// Expose functions globally for inline onclick handlers
window.toggleSidebarGroup = toggleSidebarGroup;
window.toggleSidebarItem = toggleSidebarItem;
window.toggleAllSidebar = toggleAllSidebar;
window.showSection = showSection;
window.showSectionWithTab = showSectionWithTab;
