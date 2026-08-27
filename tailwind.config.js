/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF5F2',
          100: '#FFE8E1',
          200: '#FFD4C7',
          300: '#FFAA93',
          400: '#FF7D5B',
          500: '#F0653C', // Primary Accent
          600: '#D94921',
          700: '#B53614',
          800: '#912E15',
          900: '#762B17',
          navy: '#0B132B',
          dark: '#111827',
        },
        score: {
          green: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
          bgGreen: '#ECFDF5',
          bgAmber: '#FFFBEB',
          bgRed: '#FEF2F2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 2px 12px 0 rgba(0, 0, 0, 0.04), 0 0 1px 0 rgba(0, 0, 0, 0.1)',
        'active': '0 0 0 2px #F0653C, 0 4px 12px rgba(240, 101, 60, 0.15)',
      }
    },
  },
  plugins: [],
};
