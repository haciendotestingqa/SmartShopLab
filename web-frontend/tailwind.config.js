import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          dark: 'var(--color-header)',
          main: '#f714aa',
        },
        accent: '#f97b3a',
        background: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        neon: {
          pink: '#f714aa',
          orange: '#f97b3a',
          yellow: '#f9d20c',
        },
        header: 'var(--color-header)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: 'var(--neon-glow)',
      },
    },
  },
  plugins: [forms],
};
