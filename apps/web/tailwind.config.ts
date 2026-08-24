/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07090f',
        surface: {
          0: '#0d1018',
          1: '#13161f',
          2: '#1a1e2c',
        },
        primary: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
        },
        accent: '#38bdf8',
        success: '#10d9a8',
        warning: '#fbbf24',
        danger: '#f05252',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '32px',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'fade-in': 'fade-in 0.3s ease both',
        'spin-slow': 'spin-slow 3s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { 'background-position': '-200% center' },
          '100%': { 'background-position': '200% center' },
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.24)',
        elevated: '0 12px 28px rgba(0,0,0,0.32)',
        'glow-primary': '0 0 0 3px rgba(47, 129, 247, 0.16)',
        'glow-accent': '0 0 0 3px rgba(163, 113, 247, 0.14)',
        'glow-success': '0 0 0 3px rgba(63, 185, 80, 0.14)',
        'glow-danger': '0 0 0 3px rgba(248, 81, 73, 0.14)',
      },
    },
  },
  plugins: [],
};
