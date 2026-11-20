/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#0a0912',
          main: '#f714aa',
        },
        accent: '#f97b3a',
        background: '#F8F7FC',
        neon: {
          pink: '#f714aa',
          orange: '#f97b3a',
          yellow: '#f9d20c',
        },
        text: {
          DEFAULT: '#0a0912',
          muted: '#475569',
        },
      },
    },
  },
  plugins: [],
};
