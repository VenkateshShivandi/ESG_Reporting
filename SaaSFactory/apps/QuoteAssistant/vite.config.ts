import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const quoteFormatterPlugin: Plugin = {
  name: 'quote-formatter',
  transform(code, id) {
    if (id.endsWith('.html') || id.endsWith('.js')) {
      // Your existing quote formatting logic here
      const quoteDataRegex = /QUOTE_DATA_START([\s\S]*?)QUOTE_DATA_END/;
      const match = code.match(quoteDataRegex);
      
      if (match) {
        const quoteData = JSON.parse(match[1]);
        const tableHtml = generateQuoteTable(quoteData);
        return code.replace(quoteDataRegex, tableHtml);
      }
    }
    return code;
  }
};

export default defineConfig({
  plugins: [react(), quoteFormatterPlugin],
  server: {
    //host: "0.0.0.0",
    //port: 8080,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})

// Keep the generateQuoteTable function as is
function generateQuoteTable(quoteData) {
  const itemsHtml = quoteData.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${item.unit_price.toFixed(2)}</td>
      <td>$${item.total.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div class="quote-container">
      <h2>Quote Details</h2>
      <h2>Customer Name: ${quoteData.customer_name}</h2>
      <h2>Company: ${quoteData.company}</h2>
      <table>
        <thead>
          <tr>
            <th>Item Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr class="total-row">
            <td colspan="3"><strong>Total:</strong></td>
            <td><strong>$${quoteData.total.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>
      <div class="summary">
        <p><strong>Summary:</strong> ${quoteData.summary}</p>
      </div>
    </div>
  `;
}