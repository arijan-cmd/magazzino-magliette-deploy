/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './*.tsx', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f4fd',
          100: '#e6e9fb',
          200: '#c9d0f5',
          300: '#a3aeed',
          400: '#7c86e2',
          500: '#5b63d6',
          600: '#4645c4',
          700: '#3936a0',
          800: '#302f81',
          900: '#2a2a67',
          950: '#191a3d',
        },
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
