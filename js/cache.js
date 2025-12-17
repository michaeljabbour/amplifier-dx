// ==========================================================================
// LOCAL STORAGE CACHE WITH TTL
// ==========================================================================

import { CONFIG } from './config.js';

const PREFIX = CONFIG.cache.prefix;
const TTL = CONFIG.cache.ttl;

/**
 * Get cached data if fresh
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if stale/missing
 */
export function get(key) {
  try {
    const item = localStorage.getItem(PREFIX + key);
    if (!item) return null;

    const { data, timestamp } = JSON.parse(item);
    if (Date.now() - timestamp > TTL) {
      return null; // Stale
    }
    return data;
  } catch (e) {
    console.warn('Cache read error:', e);
    return null;
  }
}

/**
 * Store data with timestamp
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export function set(key, data) {
  try {
    const item = { data, timestamp: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(item));
  } catch (e) {
    console.warn('Cache write error:', e);
  }
}

/**
 * Check if cache entry is stale
 * @param {string} key - Cache key
 * @returns {boolean} - True if stale or missing
 */
export function isStale(key) {
  try {
    const item = localStorage.getItem(PREFIX + key);
    if (!item) return true;

    const { timestamp } = JSON.parse(item);
    return Date.now() - timestamp > TTL;
  } catch (e) {
    return true;
  }
}

/**
 * Clear all cached data
 */
export function clear() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Cache clear error:', e);
  }
}

/**
 * Get timestamp of cached entry
 * @param {string} key - Cache key
 * @returns {number|null} - Timestamp or null if missing
 */
export function getTimestamp(key) {
  try {
    const item = localStorage.getItem(PREFIX + key);
    if (!item) return null;
    return JSON.parse(item).timestamp;
  } catch (e) {
    return null;
  }
}
