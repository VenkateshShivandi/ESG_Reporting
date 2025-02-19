module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#F8912E',
            hover: '#FEE846',
            dark: '#D67B1D'
          },
          assistant: {
            bg: '#FEE846',
            'bg-dark': '#D6C32B',
            text: '#000000'
          }
        },
        animation: {
          'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }
      },
    },
    plugins: [],
  };