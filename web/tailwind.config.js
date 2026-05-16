/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tile: {
          empty: 'transparent',
          edit: '#878a8c',
          correct: '#6aaa64',
          present: '#c9b458',
          absent: '#787c7e',
        },
        bg: {
          dark: '#121213',
          panel: '#1f1f21',
        },
      },
      fontFamily: {
        latin: ['Inter', 'system-ui', 'sans-serif'],
        deva: ['"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
