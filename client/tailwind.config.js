/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Dark Theme - Clean Dark (Booming-inspired)
        dark: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#262626',  // Cards/elevated
          800: '#171717',  // Surfaces
          900: '#0a0a0a',  // Main bg
          950: '#050505',  // Deepest
        },
        // Accent - Warm coral/orange
        neon: {
          cyan: '#f97316',    // Primary accent (orange)
          magenta: '#ea580c', // Darker orange
          purple: '#fb923c',  // Lighter orange
          pink: '#fdba74',    // Soft orange
          blue: '#f97316',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',  // Primary
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Light Theme - Warm cream tones
        light: {
          50: '#FFFDF8',   // Cream white bg
          100: '#FDF9F3',  // Subtle cream bg
          200: '#FAF5ED',  // Cards
          300: '#E8E2D9',  // Borders
          400: '#A39E95',  // Muted text
          500: '#737069',  // Secondary text
          600: '#525049',  // Primary text
          700: '#403E38',  // Headings
          800: '#262523',  // Dark text
          900: '#171614',  // Darkest text
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'bounce-dot': 'bounceDot 1.4s ease-in-out infinite',
        'neon-pulse': 'neonPulse 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        neonPulse: {
          '0%, 100%': { 
            boxShadow: '0 0 5px #f97316, 0 0 10px #f97316, 0 0 20px #f97316',
            borderColor: '#f97316'
          },
          '50%': { 
            boxShadow: '0 0 10px #f97316, 0 0 20px #f97316, 0 0 40px #f97316',
            borderColor: '#ea580c'
          },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(249, 115, 22, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.8), 0 0 30px rgba(249, 115, 22, 0.4)' },
        },
      },
      boxShadow: {
        'neon': '0 0 5px #f97316, 0 0 20px rgba(249, 115, 22, 0.3)',
        'neon-lg': '0 0 10px #f97316, 0 0 30px rgba(249, 115, 22, 0.4), 0 0 50px rgba(249, 115, 22, 0.2)',
        'neon-magenta': '0 0 5px #ea580c, 0 0 20px rgba(234, 88, 12, 0.3)',
        'lavender': '0 4px 14px rgba(0, 0, 0, 0.08)',
        'lavender-lg': '0 8px 30px rgba(0, 0, 0, 0.12)',
      },
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
