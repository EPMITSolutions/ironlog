/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        surface: '#141414',
        card: '#1C1C1C',
        border: '#2A2A2A',
        accent: '#C8F135',
      },
      fontFamily: {
        heading: ['var(--font-bebas)', 'sans-serif'],
        body: ['var(--font-dm)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
