module.exports = {
  content: [],
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
      fontFamily: {
        sans: ['Poppins', 'sans-serif']
      },
      maxWidth: {
        'quote': '800px'
      },
      boxShadow: {
        'quote': '0 4px 6px rgba(0, 0, 0, 0.1)'
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing': 'typing 1s infinite'
      },
      keyframes: {
        typing: {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' }
        }
      }
    }
  },
  plugins: []
};