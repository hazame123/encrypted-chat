/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(30px, -30px)' },
          '66%': { transform: 'translate(-20px, 20px)' },
        },
      },
      animation: {
        float: 'float 20s infinite ease-in-out',
        'float-delayed-1': 'float 20s infinite ease-in-out 1s',
        'float-delayed-2': 'float 20s infinite ease-in-out 2s',
        'float-delayed-3': 'float 20s infinite ease-in-out 3s',
        'float-delayed-4': 'float 20s infinite ease-in-out 4s',
      },
    },
  },
  plugins: [],
};
