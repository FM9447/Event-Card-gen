/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'gemma-blue': '#4285F4',
        'gemma-green': '#34A853',
        'gemma-yellow': '#FBBC04',
        'gemma-red': '#EA4335',
        'charcoal': '#1A1A1A',
        'slate-light': '#F8F9FA',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Outfit', 'ui-sans-serif'],
      },
      backgroundImage: {
        'blueprint-grid': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cdefs%3E%3Cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%23E2E8F0' stroke-width='0.8'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='40' height='40' fill='url(%23grid)'/%3E%3C/svg%3E")`,
      },
      animation: {
        'sparkle-pulse': 'sparklePulse 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16,1,0.3,1)',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        sparklePulse: {
          '0%, 100%': { opacity: 1, transform: 'scale(1) rotate(0deg)' },
          '50%': { opacity: 0.7, transform: 'scale(1.15) rotate(15deg)' },
        },
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'glass': '0 8px 32px rgba(66, 133, 244, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
        'card': '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        'poster': '0 20px 60px rgba(66,133,244,0.2), 0 8px 24px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
