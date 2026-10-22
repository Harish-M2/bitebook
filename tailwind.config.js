/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // Bitebook is a dark-only app (app.json sets userInterfaceStyle: "dark"). NativeWind's
  // default "media" dark mode can't be forced on web and throws there; "class" mode allows
  // the forced-dark theme to work identically across native and web.
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#0B0D0E',
        surface: '#1A1A1A',
        'surface-elevated': '#242424',
        'surface-muted': '#2A2A2A',
        border: '#3C403D',
        'text-primary': '#F8F5ED',
        'text-secondary': '#BAB7B1',
        'text-muted': '#8E9590',
        accent: '#D4AF7C',
        'accent-dark': '#0E2F26',
        rating: '#D4AF7C',
        danger: '#E86F5D',
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
