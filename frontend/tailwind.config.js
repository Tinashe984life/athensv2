/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: '#06b6d4',
          'cyan-dark': '#0891b2',
          'bg-dark': '#0f172a',
          'bg-light': '#1e293b',
          border: '#334155',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}