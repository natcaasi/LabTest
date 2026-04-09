import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  typescript: {
    strict: true,
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    dirs: ['app', 'lib', 'components', 'middleware.ts'],
  },
  compress: true,
  swcMinify: true,
  httpAgentOptions: {
    keepAlive: true,
  },
};

export default config;
