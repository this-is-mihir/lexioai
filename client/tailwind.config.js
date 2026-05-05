/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0efff',
          100: '#e5e3ff',
          200: '#ccc7ff',
          300: '#aea6ff',
          400: '#8f84ff',
          500: '#7F77DD',
          600: '#6b62c7',
          700: '#5952aa',
          800: '#4a4589',
          900: '#3e3a6f',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        soft: '0 12px 30px -16px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
}

