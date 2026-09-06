/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FBF6EC',
          soft: '#F5EEE0',
          deep: '#EDE3D2',
          line: '#E0D4BE',
        },
        ink: {
          DEFAULT: '#3E3323',
          soft: '#6B5B45',
          muted: '#9A8A72',
        },
        brand: {
          DEFAULT: '#F0803C',
          dark: '#D8652A',
          light: '#FFA36B',
        },
        accent: {
          DEFAULT: '#4FA8C8',
          dark: '#3A8AA8',
        },
        success: {
          DEFAULT: '#5FBF6A',
          dark: '#45A551',
        },
        danger: {
          DEFAULT: '#E4626B',
          dark: '#C74954',
        },
      },
      fontSize: {
        display: ['40px', { lineHeight: '46px' }],
        title: ['28px', { lineHeight: '34px' }],
      },
      borderRadius: {
        card: '22px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
