import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        priority: {
          high: '#DC2626',
          medium: '#FBBF24',
          low: '#6B7280',
        },
      },
    },
  },
  plugins: [],
  darkMode: 'media',
};

export default config;
