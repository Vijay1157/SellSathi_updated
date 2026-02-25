/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(230, 85%, 60%)',
        secondary: 'hsl(280, 80%, 65%)',
        accent: 'hsl(190, 90%, 50%)',
      },
    },
  },
  plugins: [],
}
