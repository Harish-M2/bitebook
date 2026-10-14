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
        surface: '#12171A',
        'surface-elevated': '#1A2125',
        'surface-muted': '#20282C',
        border: '#2F383D',
        'text-primary': '#F4F1EC',
        'text-secondary': '#BAB7B1',
        'text-muted': '#7D8488',
        accent: '#D7B98A',
        'accent-dark': '#A6814D',
        rating: '#E5B566',
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
