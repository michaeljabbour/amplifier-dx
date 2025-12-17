// ==========================================================================
// UPDATES SECTION & BELL NOTIFICATIONS
// ==========================================================================

import { CONFIG } from './config.js';
import { showSection } from './navigation.js';

// State
let allItems = [];
let currentFilter = 'all';

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
  return date.toLocaleDateString();
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

  // Filter items
  const filtered = currentFilter === 'all'
    ? items
    : items.filter(item => item.type === currentFilter);

  // Group by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    today: filtered.filter(i => i.date >= today),
    thisWeek: filtered.filter(i => i.date >= weekAgo && i.date < today),
    earlier: filtered.filter(i => i.date < weekAgo)
  };

  container.innerHTML = `
    <div class="updates-filters">
      <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
      <button class="filter-btn ${currentFilter === 'commit' ? 'active' : ''}" data-filter="commit">Commits</button>
      <button class="filter-btn ${currentFilter === 'release' ? 'active' : ''}" data-filter="release">Releases</button>
      <button class="filter-btn ${currentFilter === 'spec' ? 'active' : ''}" data-filter="spec">Specs</button>
    </div>

    ${groups.today.length > 0 ? `
      <div class="updates-group">
        <h3 class="updates-group-title">Today</h3>
        ${groups.today.map(renderCard).join('')}
      </div>
    ` : ''}

    ${groups.thisWeek.length > 0 ? `
      <div class="updates-group">
        <h3 class="updates-group-title">This Week</h3>
        ${groups.thisWeek.map(renderCard).join('')}
      </div>
    ` : ''}

    ${groups.earlier.length > 0 ? `
      <div class="updates-group">
        <h3 class="updates-group-title">Earlier</h3>
        ${groups.earlier.map(renderCard).join('')}
      </div>
    ` : ''}

    ${filtered.length === 0 ? `
      <div class="updates-empty">
        <p>No updates found</p>
      </div>
    ` : ''}
  `;

  // Filter click handlers
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
      currentFilter = btn.dataset.filter;
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
  return `
    <a href="${item.url}" target="_blank" class="update-card" data-type="${item.type}">
      <div class="update-card-header">
        <span class="update-type-badge" style="background: ${item.repoColor}20; color: ${item.repoColor}">
          ${getTypeIcon(item.type)}
          <span>${item.type}</span>
        </span>
        <span class="update-repo" style="color: ${item.repoColor}">${item.repo}</span>
        <span class="update-time">${formatRelativeTime(item.date)}</span>
      </div>
      <div class="update-card-body">
        <h4 class="update-title">${escapeHtml(item.message || item.name || item.tag)}</h4>
        ${item.body ? `<p class="update-body">${escapeHtml(item.body)}</p>` : ''}
        ${item.sha ? `<code class="update-sha">${item.sha}</code>` : ''}
        ${item.author ? `<span class="update-author">by ${escapeHtml(item.author)}</span>` : ''}
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
