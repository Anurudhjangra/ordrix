/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ORDRIX brand palette: deep midnight navy surfaces, electric orange
        // primary and teal secondary. `coffee` and `cream` keep their historic
        // names so existing classes pick up the new brand colours automatically.
        coffee: {
          50: '#f5f8ff',
          100: '#e7edff',
          200: '#c9d6f5',
          300: '#9db1e4',
          400: '#6d84c9',
          500: '#475fa6',
          600: '#324583',
          700: '#263467',
          800: '#182145',
          900: '#0b1126',
        },
        cream: {
          50: '#ffffff',
          100: '#f8fafc',
          200: '#e8eef7',
        },
        accent: {
          50: '#fff5ec',
          100: '#ffe6d3',
          200: '#ffc79f',
          300: '#ff9f61',
          400: '#ff7a2f',
          500: '#f25c12',
          600: '#d64509',
          700: '#a83208',
        },
        gold: {
          50: '#effdfa',
          100: '#ccfbef',
          200: '#8ff3da',
          300: '#4ce3c0',
          400: '#14b8a6',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 24px -8px rgba(11, 17, 38, 0.28)',
      },
    },
  },
  plugins: [],
};
