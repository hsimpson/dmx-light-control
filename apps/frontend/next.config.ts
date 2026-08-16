import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep project AGENTS.md as the only agent harness; Next 16 otherwise writes
  // apps/frontend/AGENTS.md + CLAUDE.md on every `next dev`.
  agentRules: false,
  experimental: {
    optimizePackageImports: [
      '@mantine/core',
      '@mantine/form',
      '@mantine/hooks',
      '@mantine/notifications',
      '@phosphor-icons/react',
      'mantine-datatable',
    ],
  },
  webpack: (config: { cache?: { type: 'memory' } }, { dev }) => {
    // PackFileCacheStrategy warns when persisting large CSS/module strings (Mantine).
    if (dev) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
};

export default nextConfig;
