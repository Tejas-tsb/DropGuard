/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#09171a',
        sidebar: '#0b1b1f',
        surface: '#102329',
        panel: '#142b30',
        line: '#294247',
        mint: '#9ce6c8',
        muted: '#9bb1b4',
      },
    },
  },
  plugins: [],
}
