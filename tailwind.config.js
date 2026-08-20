/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#080A09',
        surface: '#111412',
        'surface-elevated': '#171A18',
        'surface-muted': '#202420',
        border: '#2A2E2B',
        'text-primary': '#F5F5F2',
        'text-secondary': '#A8ADA8',
        'text-muted': '#737973',
        accent: '#39E56A',
        'accent-dark': '#1B8F3A',
        rating: '#FFB547',
        danger: '#FF5C5C',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '22px',
        pill: '999px',
      },
      spacing: {
        none: '0px',
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        xxl: '32px',
        xxxl: '40px',
        huge: '48px',
        massive: '64px',
      },
    },
  },
  plugins: [],
};
