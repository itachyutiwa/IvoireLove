/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          // Orange ivoirien #F26E27 (couleur principale)
          50: '#fef4f0',
          100: '#fde8e0',
          200: '#fbd1c1',
          300: '#f8baa2',
          400: '#f5a383',
          500: '#F26E27', // Orange ivoirien principal
          600: '#c2581f',
          700: '#914217',
          800: '#612c0f',
          900: '#301608',
        },
        secondary: {
          // Vert ivoirien #12C43F (couleur secondaire)
          50: '#e6fceb',
          100: '#ccf9d7',
          200: '#99f3af',
          300: '#66ed87',
          400: '#33e75f',
          500: '#12C43F', // Vert ivoirien principal
          600: '#0e9d32',
          700: '#0b7626',
          800: '#074e19',
          900: '#04270d',
        },
        ivory: {
          // Blanc ivoirien #FFFFFF (pour accents)
          50: '#ffffff',
          100: '#ffffff',
          200: '#ffffff',
          300: '#ffffff',
          400: '#ffffff',
          500: '#FFFFFF', // Blanc ivoirien principal
          600: '#f5f5f5',
          700: '#e8e8e8',
          800: '#d1d1d1',
          900: '#bababa',
        },
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

