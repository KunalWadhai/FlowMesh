/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#060612',
        surface: {
          0: '#0b0b1f',
          1: '#10102a',
          2: '#161636',
        },
        primary: {
          DEFAULT: '#6c63ff',
          light: '#8b85ff',
          dark: '#4f46e5',
        },
        accent: '#00d9ff',
        success: '#00e5a0',
        warning: '#ffb020',
        danger: '#ff4d6d',
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
        card: '0 4px 24px rgba(0,0,0,0.4)',
        elevated: '0 8px 48px rgba(0,0,0,0.6)',
        'glow-primary': '0 0 40px rgba(108, 99, 255, 0.3)',
        'glow-accent': '0 0 40px rgba(0, 217, 255, 0.25)',
        'glow-success': '0 0 30px rgba(0, 229, 160, 0.25)',
        'glow-danger': '0 0 30px rgba(255, 77, 109, 0.25)',
      },
    },
  },
  plugins: [],
};
