/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#1E293B',
          main: '#2563EB',
        },
        accent: '#7C3AED',
        background: '#F9FAFB',
        text: {
          DEFAULT: '#0F172A',
          muted: '#475569',
        },
      },
    },
  },
  plugins: [],
};
