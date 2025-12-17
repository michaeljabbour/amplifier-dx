// ==========================================================================
// GITHUB API WITH CACHING
// ==========================================================================

import { CONFIG } from './config.js';
import * as cache from './cache.js';

const CACHE_KEY = 'github-data';

// Data ready callbacks
const callbacks = [];

// Demo data when API fails (repos don't exist or rate limited)
const DEMO_DATA = [
  {
    type: 'commit',
    repo: 'amplifier',
    repoColor: '#3b82f6',
    sha: 'a1b2c3d',
    message: 'feat: Add streaming support for orchestrator',
    author: 'Amplifier Team',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    url: 'https://github.com/microsoft/amplifier'
  },
  {
    type: 'release',
    repo: 'amplifier-core',
    repoColor: '#10b981',
    sha: null,
    tag: 'v0.3.0',
    name: 'Amplifier Core v0.3.0',
    body: 'New hook system, improved tool registration, better error handling',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    url: 'https://github.com/microsoft/amplifier-core'
  },
  {
    type: 'commit',
    repo: 'amplifier-foundation',
    repoColor: '#a855f7',
    sha: 'e4f5g6h',
    message: 'fix: Resolve context manager memory leak',
    author: 'Amplifier Team',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    url: 'https://github.com/microsoft/amplifier-foundation'
  },
  {
    type: 'spec',
    repo: 'specs',
    repoColor: '#f59e0b',
    sha: 'i7j8k9l',
    message: 'docs: Update module boundaries specification',
    author: 'Amplifier Team',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    url: 'https://github.com/microsoft/amplifier-dx'
  },
  {
    type: 'commit',
    repo: 'amplifier',
    repoColor: '#3b82f6',
    sha: 'm1n2o3p',
    message: 'refactor: Simplify provider registration flow',
    author: 'Amplifier Team',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    url: 'https://github.com/microsoft/amplifier'
  }
];

/**
 * Register callback for when data is ready
 * @param {Function} cb - Callback function receiving items array
 */
export function onDataReady(cb) {
  callbacks.push(cb);
}

/**
 * Notify all callbacks with data
 * @param {Array} items - Update items
 */
function notifyCallbacks(items) {
  callbacks.forEach(cb => cb(items));
}

/**
 * Fetch commits from a repository
 * @param {Object} repo - Repository config
 * @returns {Promise<Array>} - Commit items
 */
async function fetchCommits(repo) {
  try {
    const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits?per_page=${CONFIG.ui.commitsPerRepo}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const commits = await response.json();
    return commits.map(c => ({
      type: 'commit',
      repo: repo.label,
      repoColor: repo.color,
      sha: c.sha.substring(0, 7),
      message: c.commit.message.split('\n')[0],
      author: c.commit.author.name,
      date: new Date(c.commit.author.date),
      url: c.html_url
    }));
  } catch (e) {
    console.warn(`Failed to fetch commits for ${repo.repo}:`, e);
    return [];
  }
}

/**
 * Fetch releases from a repository
 * @param {Object} repo - Repository config
 * @returns {Promise<Array>} - Release items
 */
async function fetchReleases(repo) {
  try {
    const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases?per_page=5`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const releases = await response.json();
    return releases.map(r => ({
      type: 'release',
      repo: repo.label,
      repoColor: repo.color,
      tag: r.tag_name,
      name: r.name || r.tag_name,
      body: r.body ? r.body.substring(0, 200) : '',
      date: new Date(r.published_at),
      url: r.html_url
    }));
  } catch (e) {
    console.warn(`Failed to fetch releases for ${repo.repo}:`, e);
    return [];
  }
}

/**
 * Fetch spec changes (commits to specs submodule)
 * @returns {Promise<Array>} - Spec change items
 */
async function fetchSpecChanges() {
  try {
    // Check amplifier-dx repo for spec changes
    const url = 'https://api.github.com/repos/michaeljabbour/amplifier-dx/commits?path=specs&per_page=5';
    const response = await fetch(url);
    if (!response.ok) return [];

    const commits = await response.json();
    return commits.map(c => ({
      type: 'spec',
      repo: 'specs',
      repoColor: '#f59e0b',
      sha: c.sha.substring(0, 7),
      message: c.commit.message.split('\n')[0],
      author: c.commit.author.name,
      date: new Date(c.commit.author.date),
      url: c.html_url
    }));
  } catch (e) {
    console.warn('Failed to fetch spec changes:', e);
    return [];
  }
}

/**
 * Fetch all data from all sources
 * @returns {Promise<Array>} - All items sorted by date
 */
export async function fetchAll() {
  // Try cache first
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    // Parse dates back from JSON
    const items = cached.map(item => ({
      ...item,
      date: new Date(item.date)
    }));
    notifyCallbacks(items);
    return items;
  }

  // Fetch fresh data
  const results = await Promise.all([
    ...CONFIG.repos.map(repo => fetchCommits(repo)),
    ...CONFIG.repos.map(repo => fetchReleases(repo)),
    fetchSpecChanges()
  ]);

  // Flatten and sort by date
  let items = results.flat().sort((a, b) => b.date - a.date);

  // If no data fetched (API failures), use demo data
  if (items.length === 0) {
    console.log('Using demo data (GitHub API unavailable or repos not found)');
    items = DEMO_DATA.map(item => ({
      ...item,
      date: new Date(item.date) // Ensure dates are Date objects
    }));
  }

  // Cache results
  cache.set(CACHE_KEY, items);

  notifyCallbacks(items);
  return items;
}

/**
 * Get cached data immediately, refresh in background if stale
 * @returns {Promise<Array>} - Items (cached or fresh)
 */
export async function getWithBackgroundRefresh() {
  const cached = cache.get(CACHE_KEY);

  if (cached) {
    const items = cached.map(item => ({
      ...item,
      date: new Date(item.date)
    }));

    // Check if stale and refresh in background
    if (cache.isStale(CACHE_KEY)) {
      refresh().catch(console.warn);
    }

    return items;
  }

  // No cache, must fetch
  return fetchAll();
}

/**
 * Force refresh data
 * @returns {Promise<Array>} - Fresh items
 */
export async function refresh() {
  cache.clear();
  return fetchAll();
}
