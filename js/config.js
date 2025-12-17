// ==========================================================================
// CONFIGURATION
// ==========================================================================

export const CONFIG = {
  // GitHub repositories to track
  repos: [
    { owner: 'microsoft', repo: 'amplifier', label: 'amplifier', color: '#3b82f6', type: 'main' },
    { owner: 'microsoft', repo: 'amplifier-core', label: 'core', color: '#10b981', type: 'core' },
    { owner: 'microsoft', repo: 'amplifier-foundation', label: 'foundation', color: '#a855f7', type: 'foundation' }
  ],

  // Cache settings
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    prefix: 'amp-dx-'
  },

  // Valid navigation sections
  sections: [
    'home', 'quickstart', 'architecture', 'guides', 'reference',
    'cli', 'ecosystem', 'showcase', 'examples', 'contribute', 'updates'
  ],

  // UI settings
  ui: {
    bellMaxItems: 8,
    recentDays: 7,
    commitsPerRepo: 10
  }
};
