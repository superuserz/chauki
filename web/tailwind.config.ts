import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './stores/**/*.{ts,tsx}',
  ],
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
}

export default config
