/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette matched to cafemyfrappe.com: warm red (#ed1b24),
        // green (#00b545), gold (#ffc700) and off-white on deep warm brown.
        // `coffee` and `cream` keep their historic names so existing classes
        // pick up the new brand colours automatically.
        coffee: {
          50: '#faf4f1',
          100: '#f3e3dc',
          200: '#e6c8bb',
          300: '#d3a28d',
          400: '#b9755a',
          500: '#9a5540',
          600: '#7b3f2e',
          700: '#5f2f22',
          800: '#3d1d14',
          900: '#220d08',
        },
        cream: {
          50: '#fdfcf9',
          100: '#f7f4ec',
          200: '#ece6d8',
        },
        accent: {
          50: '#fdeaea',
          100: '#fbd0d1',
          200: '#f6a3a6',
          300: '#f27075',
          400: '#ed1b24',
          500: '#d3121b',
          600: '#b00c14',
          700: '#8a0a10',
        },
        gold: {
          50: '#fff8e1',
          100: '#ffefb8',
          200: '#ffe285',
          300: '#ffd34d',
          400: '#ffc700',
          500: '#e0ad00',
          600: '#b38700',
          700: '#856300',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 24px -8px rgba(58, 20, 37, 0.25)',
      },
    },
  },
  plugins: [],
};
