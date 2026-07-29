/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables toggle class-based dark mode
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#F4F7FE',
          blue: '#1A56DB',
          darkBlue: '#002E94',
          accent: '#3F83F8',
          cardBg: 'rgba(255, 255, 255, 0.45)',
          cardBgDark: 'rgba(17, 24, 39, 0.6)'
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
