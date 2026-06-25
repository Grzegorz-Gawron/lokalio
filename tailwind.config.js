/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand (1:1 z lokalio design system)
        coral: {
          DEFAULT: '#FF5A4D',
          pressed: '#E84B3F',
          soft: '#FFE8E5',
          disabled: '#FFB5AE',
        },
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        cream: 'rgb(var(--c-bg) / <alpha-value>)',
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        subtle: 'rgb(var(--c-subtle) / <alpha-value>)',
        // Semantic
        success: '#3FAE83',
        danger: '#D14520',
        warning: '#C4954A',
        info: '#185FA5',
        // Kategorie
        cat: {
          concert: '#FF5A4D',
          sport: '#3FAE83',
          culture: '#7A5C99',
          social: '#8C5A1F',
          party: '#2D5DAA',
          gastro: '#E0892B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
        sheet: '26px',
      },
      boxShadow: {
        card: '0 6px 24px -10px rgba(15, 23, 41, 0.18)',
        float: '0 12px 40px -12px rgba(15, 23, 41, 0.30)',
        coral: '0 8px 24px -8px rgba(255, 90, 77, 0.55)',
      },
      maxWidth: {
        app: '440px',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.4)', opacity: '0' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        'bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(22px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-22px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pop': 'pop 0.4s ease-out',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'bob': 'bob 2.4s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slide-in-left 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
