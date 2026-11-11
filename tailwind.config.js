/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        pine: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#10b981',
          700: '#0b6b4d', // Verde pino institucional del botón y marca
          800: '#09573e',
          900: '#064230',
        },
        surface: {
          app: '#eaf8f2',      // Fondo general menta pastel
          card: '#ffffff',
          sidebar: '#ffffff',
          active: '#e8f5ee',   // Fondo del elemento seleccionado
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49'
        },
        clinical: {
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          teal: '#0d9488'
        }
      }
    },
  },
  plugins: [],
};
