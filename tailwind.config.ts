import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: '#1a1a1a',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#1a1a1a',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: '#f3f4f6',
          foreground: '#1a1a1a',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: '#1a1a1a',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#f87171',
          foreground: '#ffffff',
        },
        border: 'var(--border)',
        input: '#e5e7eb',
        ring: '#1a1a1a',
        /* Legacy / Custom names */
        bg: 'var(--background)',
        surface: '#f9f9f9',
        surface2: '#f3f4f6',
        text: 'var(--foreground)',
        grey: '#9ca3af',
        'brand-green': '#1a1a1a',
        'brand-green-dim': 'rgba(26,26,26,0.05)',
        'brand-red': '#f87171',
        'brand-red-dim': 'rgba(248,113,113,0.1)',
        success: '#1a1a1a',
        danger: '#f87171',
        darkTheme: {
          background: 'var(--background)',
          card: 'var(--card)',
          border: 'var(--border)',
          foreground: 'var(--foreground)',
          muted: 'var(--muted)',
          mutedFg: 'var(--muted-foreground)',
        },
      },
      fontFamily: {
        sans: ['var(--font-instrument-sans)', 'sans-serif'],
        serif: ['var(--font-playfair-display)', 'serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.8s ease forwards',
        ticker: 'ticker 20s linear infinite',
        pulseGlow: 'pulseGlow 2s ease infinite',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
      boxShadow: {
        'brand-green': '0 0 0 1px #7eb89a, 0 0 32px rgba(126,184,154,0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
