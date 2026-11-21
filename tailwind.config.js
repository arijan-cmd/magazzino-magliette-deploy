/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './*.tsx', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#bdd0ff',
          300: '#93b0ff',
          400: '#6a8cff',
          500: '#4c7dff',
          600: '#3b63e6',
          700: '#2f4fc2',
          800: '#2b4399',
          900: '#243a7a',
          950: '#141f4d',
        },
        // Tema scuro "notte neon": blu-indaco profondo al posto del grigio slate
        night: {
          50: '#f1f4ff',
          100: '#e8ecff',
          200: '#d3dbf8',
          300: '#b7c2f0',
          400: '#9aa8e0',
          500: '#7886cc',
          600: '#4f5dc4',
          700: '#2d3aa6',
          800: '#171f7c',
          900: '#0d1360',
          950: '#070a38',
        },
        neon: { cyan: '#22e4f0', green: '#34f0b0', violet: '#a58bff', amber: '#ffb86b', rose: '#ff6b8a' },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 4px 16px -4px rgba(15, 23, 42, 0.08)',
        softer: '0 1px 2px 0 rgba(15, 23, 42, 0.03)',
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
