import './base.css';

export const theme = {
  colors: {
    primary: '#F8912E',
    primaryHover: '#FEE846',
    primaryDark: '#D67B1D',
    assistant: {
      bg: '#FEE846',
      bgDark: '#D6C32B',
      text: '#000000'
    }
  },
  spacing: {
    quote: {
      maxWidth: '800px',
      padding: '20px'
    }
  }
};

export const styles = {
  quote: {
    container: 'quote-container',
    table: 'quote-table',
    totalRow: 'total-row'
  },
  message: {
    base: 'message',
    assistant: 'message-assistant',
    user: 'message-user',
    typing: 'typing-indicator'
  }
};