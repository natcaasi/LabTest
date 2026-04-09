import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ['app', 'lib', 'components', 'middleware.ts'],
  },
  compress: true,
  httpAgentOptions: {
    keepAlive: true,
  },
};

export default config;
