import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        raised: '#131313',
        border: '#262626',
        dim: '#1a1a1a',
        text: '#f5f5f0',
        muted: '#7a7a70',
        subtle: '#555555',
        accent: '#d4ff4a',
        success: '#6ee787',
        warn: '#ffa24a',
        danger: '#ff4466',
        xPlat: '#ffffff'
      },
      fontFamily: {
        serif: ['var(--font-instrument-serif)', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace']
      },
      boxShadow: {
        lime: '0 0 0 1px #d4ff4a, 0 0 32px rgba(212,255,74,0.18)'
      }
    }
  },
  plugins: []
};

export default config;
