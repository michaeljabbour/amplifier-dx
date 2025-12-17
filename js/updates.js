// ==========================================================================
// UPDATES SECTION & BELL NOTIFICATIONS
// ==========================================================================

import { CONFIG } from './config.js';
import { showSection } from './navigation.js';

// State
let allItems = [];
let filters = {
  repo: 'all',
  type: 'all',
  search: ''
};

/**
 * Format relative time
 * @param {Date} date - Date to format
 * @returns {string} - Relative time string
 */
function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString();
}

/**
 * Format full date
 * @param {Date} date - Date to format
 * @returns {string} - Full date string
 */
function formatFullDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get type icon
 * @param {string} type - Item type
 * @returns {string} - Icon HTML
 */
function getTypeIcon(type) {
  const icons = {
    commit: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3"/><path d="M8 0v5M8 11v5" stroke="currentColor" stroke-width="2"/></svg>',
    release: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0L10 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z"/></svg>',
    spec: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h8l4 4v10H2V2zm8 0v4h4"/></svg>'
  };
  return icons[type] || '';
}

/**
 * Get items from last N days
 * @param {Array} items - All items
 * @param {number} days - Number of days
 * @returns {Array} - Recent items
 */
function getRecentItems(items, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return items.filter(item => item.date > cutoff);
}

/**
 * Apply all filters to items
 * @param {Array} items - All items
 * @returns {Array} - Filtered items
 */
function applyFilters(items) {
  return items.filter(item => {
    // Repo filter
    if (filters.repo !== 'all' && item.repo !== filters.repo) {
      return false;
    }
    // Type filter
    if (filters.type !== 'all' && item.type !== filters.type) {
      return false;
    }
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const message = (item.message || item.name || item.tag || '').toLowerCase();
      const author = (item.author || '').toLowerCase();
      if (!message.includes(searchLower) && !author.includes(searchLower)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Get unique repos from items
 * @param {Array} items - All items
 * @returns {Array} - Unique repo objects with counts
 */
function getRepoStats(items) {
  const repos = {};
  items.forEach(item => {
    if (!repos[item.repo]) {
      repos[item.repo] = { name: item.repo, color: item.repoColor, count: 0 };
    }
    repos[item.repo].count++;
  });
  return Object.values(repos).sort((a, b) => b.count - a.count);
}

/**
 * Get type stats from items
 * @param {Array} items - All items
 * @returns {Object} - Type counts
 */
function getTypeStats(items) {
  return {
    commit: items.filter(i => i.type === 'commit').length,
    release: items.filter(i => i.type === 'release').length,
    spec: items.filter(i => i.type === 'spec').length
  };
}

/**
 * Render bell notification dropdown
 * @param {Array} items - Update items
 */
export function renderBell(items) {
  allItems = items;
  const bell = document.getElementById('notification-bell');
  const dropdown = document.getElementById('notification-dropdown');
  const badge = document.getElementById('notification-badge');

  if (!bell || !dropdown) {
    console.warn('Bell elements not found');
    return;
  }

  // Count recent items
  const recentItems = getRecentItems(items, CONFIG.ui.recentDays);
  const count = recentItems.length;

  // Update badge
  if (badge) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  // Build dropdown content
  const displayItems = items.slice(0, CONFIG.ui.bellMaxItems);
  dropdown.innerHTML = `
    <div class="notification-header">
      <span>Recent Updates</span>
      <button class="notification-view-all" data-action="view-all">View All</button>
    </div>
    <div class="notification-list">
      ${displayItems.length === 0 ? '<div class="notification-empty">No updates</div>' : ''}
      ${displayItems.map(item => `
        <a href="${item.url}" target="_blank" class="notification-item" data-type="${item.type}">
          <div class="notification-icon" style="color: ${item.repoColor}">
            ${getTypeIcon(item.type)}
          </div>
          <div class="notification-content">
            <div class="notification-title">${escapeHtml(item.message || item.name || item.tag)}</div>
            <div class="notification-meta">
              <span class="notification-repo" style="color: ${item.repoColor}">${item.repo}</span>
              <span class="notification-time">${formatRelativeTime(item.date)}</span>
            </div>
          </div>
        </a>
      `).join('')}
    </div>
  `;

  // Bell click handler
  bell.onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  };

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  // View all click
  dropdown.addEventListener('click', (e) => {
    const viewAll = e.target.closest('[data-action="view-all"]');
    if (viewAll) {
      e.preventDefault();
      dropdown.classList.remove('show');
      showSection('updates');
    }
  });
}

/**
 * Render Updates section
 * @param {Array} items - Update items
 */
export function renderSection(items) {
  allItems = items;
  const container = document.getElementById('updates-list');
  if (!container) {
    console.warn('Updates container not found');
    return;
  }

  const repoStats = getRepoStats(items);
  const typeStats = getTypeStats(items);
  const filtered = applyFilters(items);

  // Group by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const groups = {
    today: filtered.filter(i => i.date >= today),
    thisWeek: filtered.filter(i => i.date >= weekAgo && i.date < today),
    thisMonth: filtered.filter(i => i.date >= monthAgo && i.date < weekAgo),
    earlier: filtered.filter(i => i.date < monthAgo)
  };

  container.innerHTML = `
    <div class="updates-controls">
      <!-- Search -->
      <div class="updates-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="M21 21l-4.35-4.35"></path>
        </svg>
        <input type="text" placeholder="Search commits, releases..." value="${escapeHtml(filters.search)}" id="updates-search-input">
      </div>

      <!-- Filter Row -->
      <div class="updates-filter-row">
        <!-- Repo Filters -->
        <div class="updates-filter-group">
          <span class="updates-filter-label">Repository:</span>
          <div class="updates-chips">
            <button class="updates-chip ${filters.repo === 'all' ? 'active' : ''}" data-repo="all">
              All <span class="chip-count">${items.length}</span>
            </button>
            ${repoStats.map(repo => `
              <button class="updates-chip ${filters.repo === repo.name ? 'active' : ''}" data-repo="${repo.name}" style="--chip-color: ${repo.color}">
                ${repo.name} <span class="chip-count">${repo.count}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Type Filters -->
        <div class="updates-filter-group">
          <span class="updates-filter-label">Type:</span>
          <div class="updates-chips">
            <button class="updates-chip ${filters.type === 'all' ? 'active' : ''}" data-type="all">
              All
            </button>
            <button class="updates-chip ${filters.type === 'commit' ? 'active' : ''}" data-type="commit">
              ${getTypeIcon('commit')} Commits <span class="chip-count">${typeStats.commit}</span>
            </button>
            <button class="updates-chip ${filters.type === 'release' ? 'active' : ''}" data-type="release">
              ${getTypeIcon('release')} Releases <span class="chip-count">${typeStats.release}</span>
            </button>
            <button class="updates-chip ${filters.type === 'spec' ? 'active' : ''}" data-type="spec">
              ${getTypeIcon('spec')} Specs <span class="chip-count">${typeStats.spec}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Results count -->
      <div class="updates-results-count">
        Showing <strong>${filtered.length}</strong> of ${items.length} updates
        ${filters.repo !== 'all' || filters.type !== 'all' || filters.search ? `
          <button class="updates-clear-filters" data-action="clear-filters">Clear filters</button>
        ` : ''}
      </div>
    </div>

    <div class="updates-timeline">
      ${groups.today.length > 0 ? `
        <div class="updates-group">
          <div class="updates-group-header">
            <span class="updates-group-title">Today</span>
            <span class="updates-group-count">${groups.today.length}</span>
          </div>
          <div class="updates-group-items">
            ${groups.today.map(renderCard).join('')}
          </div>
        </div>
      ` : ''}

      ${groups.thisWeek.length > 0 ? `
        <div class="updates-group">
          <div class="updates-group-header">
            <span class="updates-group-title">This Week</span>
            <span class="updates-group-count">${groups.thisWeek.length}</span>
          </div>
          <div class="updates-group-items">
            ${groups.thisWeek.map(renderCard).join('')}
          </div>
        </div>
      ` : ''}

      ${groups.thisMonth.length > 0 ? `
        <div class="updates-group">
          <div class="updates-group-header">
            <span class="updates-group-title">This Month</span>
            <span class="updates-group-count">${groups.thisMonth.length}</span>
          </div>
          <div class="updates-group-items">
            ${groups.thisMonth.map(renderCard).join('')}
          </div>
        </div>
      ` : ''}

      ${groups.earlier.length > 0 ? `
        <div class="updates-group">
          <div class="updates-group-header">
            <span class="updates-group-title">Earlier</span>
            <span class="updates-group-count">${groups.earlier.length}</span>
          </div>
          <div class="updates-group-items">
            ${groups.earlier.map(renderCard).join('')}
          </div>
        </div>
      ` : ''}

      ${filtered.length === 0 ? `
        <div class="updates-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <div>No updates match your filters</div>
          <button class="updates-clear-filters" data-action="clear-filters" style="margin-top: 12px;">Clear filters</button>
        </div>
      ` : ''}
    </div>
  `;

  // Attach event handlers
  attachEventHandlers(container);
}

/**
 * Attach event handlers to the updates container
 * @param {HTMLElement} container - Updates container
 */
function attachEventHandlers(container) {
  // Repo filter clicks (only target chips, not cards)
  container.querySelectorAll('.updates-chip[data-repo]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      filters.repo = btn.dataset.repo;
      renderSection(allItems);
    };
  });

  // Type filter clicks (only target chips, not cards)
  container.querySelectorAll('.updates-chip[data-type]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      filters.type = btn.dataset.type;
      renderSection(allItems);
    };
  });

  // Search input
  const searchInput = container.querySelector('#updates-search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.oninput = (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filters.search = e.target.value;
        renderSection(allItems);
      }, 300);
    };
  }

  // Clear filters
  container.querySelectorAll('[data-action="clear-filters"]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      filters = { repo: 'all', type: 'all', search: '' };
      renderSection(allItems);
    };
  });
}

/**
 * Render a single update card
 * @param {Object} item - Update item
 * @returns {string} - Card HTML
 */
function renderCard(item) {
  const typeLabels = { commit: 'Commit', release: 'Release', spec: 'Spec' };

  return `
    <a href="${item.url}" target="_blank" class="update-card" data-type="${item.type}">
      <div class="update-card-left">
        <div class="update-card-icon" style="background: ${item.repoColor}20; color: ${item.repoColor}">
          ${getTypeIcon(item.type)}
        </div>
      </div>
      <div class="update-card-content">
        <div class="update-card-header">
          <span class="update-card-repo" style="background: ${item.repoColor}15; color: ${item.repoColor}">${item.repo}</span>
          <span class="update-card-type">${typeLabels[item.type]}</span>
          ${item.sha ? `<code class="update-card-sha">${item.sha}</code>` : ''}
          ${item.tag ? `<span class="update-card-tag">${item.tag}</span>` : ''}
          <span class="update-card-time" title="${formatFullDate(item.date)}">${formatRelativeTime(item.date)}</span>
        </div>
        <div class="update-card-message">${escapeHtml(item.message || item.name || item.tag)}</div>
        ${item.body ? `<div class="update-card-body">${escapeHtml(item.body.substring(0, 150))}${item.body.length > 150 ? '...' : ''}</div>` : ''}
        ${item.author ? `<div class="update-card-author">by ${escapeHtml(item.author)}</div>` : ''}
      </div>
      <div class="update-card-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </a>
  `;
}

/**
 * Escape HTML entities
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Initialize updates module
 * @param {Array} items - Initial items
 */
export function initUpdates(items) {
  renderBell(items);
  renderSection(items);
}
