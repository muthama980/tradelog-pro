/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme-sensitive: read from RGB CSS variables so opacity modifiers
        // (e.g. bg-bg/80, border-border/50) work in both light and dark mode.
        bg: {
          DEFAULT: 'rgb(var(--bg-rgb) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated-rgb) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border-rgb) / <alpha-value>)',
          strong: 'rgb(var(--border-strong-rgb) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--text-rgb) / <alpha-value>)',
          muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
          dim: 'rgb(var(--text-dim-rgb) / <alpha-value>)',
        },
        // Accent and signals stay the same in both themes — hardcoded.
        accent: {
          DEFAULT: '#00D9FF',
          dim: '#0891B2',
          glow: '#06B6D4',
        },
        signal: {
          green: '#22C55E',
          red: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      animation: {
        'fade-up':    'fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in':    'fadeIn 0.6s ease-out forwards',
        'ticker':     'ticker 40s linear infinite',
        'pulse-cyan': 'pulseCyan 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseCyan: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 217, 255, 0.4)' },
          '50%':      { boxShadow: '0 0 0 10px rgba(0, 217, 255, 0)' },
        },
      },
    },
  },
  plugins: [],
};
