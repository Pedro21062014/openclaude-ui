/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Claude-inspired palette
        claude: {
          50: '#faf9f7',
          100: '#f5f3ee',
          200: '#ebe7dc',
          300: '#d8cfb8',
          400: '#bfb088',
          500: '#a89263',
          600: '#8c764f',
          700: '#705c40',
          800: '#5a4a34',
          900: '#4a3d2c',
          950: '#2a2118',
          accent: '#d97757',
        },
        chatgpt: {
          bg: '#212121',
          sidebar: '#171717',
          border: '#2d2d2d',
          hover: '#2f2f2f',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#1e1e1e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      animation: {
        'thinking-gradient': 'thinking-gradient 3s ease infinite',
        'thinking-pulse': 'thinking-pulse 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow': 'spin 2s linear infinite',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite both',
      },
      keyframes: {
        'thinking-gradient': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'thinking-pulse': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
