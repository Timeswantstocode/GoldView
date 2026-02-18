/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Devanagari"', 'sans-serif'],
      },
      colors: {
        gold: {
          DEFAULT: '#D4AF37',
          dark: '#b8860b'
        },
        tejabi: {
          DEFAULT: '#CD7F32',
          dark: '#8B4513'
        }
      },
      animation: {
        'in': 'fadeIn 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
