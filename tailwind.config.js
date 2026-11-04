/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0284c7', // Azul institucional principal
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49'
        },
        clinical: {
          success: '#10b981', // Vacunas al día / cita completada
          warning: '#f59e0b', // Cita pendiente / stock bajo
          danger: '#ef4444',  // Emergencia / stock crítico / vencido
          teal: '#0d9488'     // Quirófano / atención médica
        }
      }
    },
  },
  plugins: [],
};
