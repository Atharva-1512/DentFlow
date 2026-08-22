/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#fbf7f0',
          100: '#f4eadb',
          200: '#ead7bd',
          300: '#ddc09c',
          400: '#cfaa7d',
          500: '#bd9060',
          600: '#a9794e',
          700: '#8d613e',
          800: '#704b32',
          900: '#553725',
          950: '#352217',
        },
        cyan: {
          400: '#e5c38f',
          500: '#cfa15f',
          600: '#b78645',
        },
        slate: {
          850: '#172033',
          950: '#0b1120',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'teal-cyan': 'linear-gradient(135deg, #a9794e 0%, #cfa15f 100%)',
        'cyan-blue': 'linear-gradient(135deg, #cfa15f 0%, #e5c38f 100%)',
        'mesh-light':
          'radial-gradient(circle at 20% 20%, rgba(169,121,78,0.14) 0%, transparent 40%), radial-gradient(circle at 80% 30%, rgba(229,195,143,0.18) 0%, transparent 45%), radial-gradient(circle at 50% 80%, rgba(244,234,219,0.24) 0%, transparent 40%)',
      },
      boxShadow: {
        glow: '0 0 30px rgba(207,161,95,0.35)',
        'glow-teal': '0 0 40px rgba(169,121,78,0.30)',
        card: '0 10px 40px -10px rgba(84,58,38,0.12)',
        'card-hover': '0 20px 50px -12px rgba(169,121,78,0.25)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '33%': { transform: 'translateY(-18px) translateX(8px)' },
          '66%': { transform: 'translateY(10px) translateX(-6px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '70%': { transform: 'scale(1.3)', opacity: '0' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 12s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 3s ease-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
        'gradient-x': 'gradient-x 8s ease infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'scale-in': 'scale-in 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
};
