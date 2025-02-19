// vite.config.ts
import { defineConfig } from "file:///Users/amiteshtripathi/Documents/GAMAN/QuoteAssistant/node_modules/vite/dist/node/index.js";
import react from "file:///Users/amiteshtripathi/Documents/GAMAN/QuoteAssistant/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  },
  transformers: {
    "quote-formatter": (code) => {
      const quoteDataRegex = /QUOTE_DATA_START([\s\S]*?)QUOTE_DATA_END/;
      const match = code.match(quoteDataRegex);
      if (match) {
        const quoteData = JSON.parse(match[1]);
        const tableHtml = generateQuoteTable(quoteData);
        return code.replace(quoteDataRegex, tableHtml);
      }
      return code;
    }
  }
});
function generateQuoteTable(quoteData) {
  const itemsHtml = quoteData.items.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${item.unit_price.toFixed(2)}</td>
      <td>$${item.total.toFixed(2)}</td>
    </tr>
  `).join("");
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
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYW1pdGVzaHRyaXBhdGhpL0RvY3VtZW50cy9HQU1BTi9RdW90ZUFzc2lzdGFudFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2FtaXRlc2h0cmlwYXRoaS9Eb2N1bWVudHMvR0FNQU4vUXVvdGVBc3Npc3RhbnQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2FtaXRlc2h0cmlwYXRoaS9Eb2N1bWVudHMvR0FNQU4vUXVvdGVBc3Npc3RhbnQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHNlcnZlcjoge1xuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTo4MDgwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgJycpXG4gICAgICB9XG4gICAgfVxuICB9LFxuICAvLyBBZGQgYSBjdXN0b20gZGF0YSB0cmFuc2Zvcm1hdGlvbiBmb3IgcXVvdGUgZm9ybWF0dGluZ1xuICB0cmFuc2Zvcm1lcnM6IHtcbiAgICAncXVvdGUtZm9ybWF0dGVyJzogKGNvZGUpID0+IHtcbiAgICAgIC8vIFBhcnNlIHRoZSBRVU9URV9EQVRBX1NUQVJUIGFuZCBRVU9URV9EQVRBX0VORCBtYXJrZXJzXG4gICAgICBjb25zdCBxdW90ZURhdGFSZWdleCA9IC9RVU9URV9EQVRBX1NUQVJUKFtcXHNcXFNdKj8pUVVPVEVfREFUQV9FTkQvO1xuICAgICAgY29uc3QgbWF0Y2ggPSBjb2RlLm1hdGNoKHF1b3RlRGF0YVJlZ2V4KTtcbiAgICAgIFxuICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgIGNvbnN0IHF1b3RlRGF0YSA9IEpTT04ucGFyc2UobWF0Y2hbMV0pO1xuICAgICAgICAvLyBHZW5lcmF0ZSBIVE1MIHRhYmxlIGZyb20gcXVvdGUgZGF0YVxuICAgICAgICBjb25zdCB0YWJsZUh0bWwgPSBnZW5lcmF0ZVF1b3RlVGFibGUocXVvdGVEYXRhKTtcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgbWFya2VycyB3aXRoIGZvcm1hdHRlZCBIVE1MXG4gICAgICAgIHJldHVybiBjb2RlLnJlcGxhY2UocXVvdGVEYXRhUmVnZXgsIHRhYmxlSHRtbCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY29kZTtcbiAgICB9XG4gIH1cbn0pXG5cbmZ1bmN0aW9uIGdlbmVyYXRlUXVvdGVUYWJsZShxdW90ZURhdGEpIHtcbiAgY29uc3QgaXRlbXNIdG1sID0gcXVvdGVEYXRhLml0ZW1zLm1hcChpdGVtID0+IGBcbiAgICA8dHI+XG4gICAgICA8dGQ+JHtpdGVtLm5hbWV9PC90ZD5cbiAgICAgIDx0ZD4ke2l0ZW0ucXVhbnRpdHl9PC90ZD5cbiAgICAgIDx0ZD4kJHtpdGVtLnVuaXRfcHJpY2UudG9GaXhlZCgyKX08L3RkPlxuICAgICAgPHRkPiQke2l0ZW0udG90YWwudG9GaXhlZCgyKX08L3RkPlxuICAgIDwvdHI+XG4gIGApLmpvaW4oJycpO1xuXG4gIHJldHVybiBgXG4gICAgPGRpdiBjbGFzcz1cInF1b3RlLWNvbnRhaW5lclwiPlxuICAgICAgPGgyPlF1b3RlIERldGFpbHM8L2gyPlxuICAgICAgPGgyPkN1c3RvbWVyIE5hbWU6ICR7cXVvdGVEYXRhLmN1c3RvbWVyX25hbWV9PC9oMj5cbiAgICAgIDxoMj5Db21wYW55OiAke3F1b3RlRGF0YS5jb21wYW55fTwvaDI+XG4gICAgICA8dGFibGU+XG4gICAgICAgIDx0aGVhZD5cbiAgICAgICAgICA8dHI+XG4gICAgICAgICAgICA8dGg+SXRlbSBEZXNjcmlwdGlvbjwvdGg+XG4gICAgICAgICAgICA8dGg+UXVhbnRpdHk8L3RoPlxuICAgICAgICAgICAgPHRoPlVuaXQgUHJpY2U8L3RoPlxuICAgICAgICAgICAgPHRoPlRvdGFsPC90aD5cbiAgICAgICAgICA8L3RyPlxuICAgICAgICA8L3RoZWFkPlxuICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgJHtpdGVtc0h0bWx9XG4gICAgICAgICAgPHRyIGNsYXNzPVwidG90YWwtcm93XCI+XG4gICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjNcIj48c3Ryb25nPlRvdGFsOjwvc3Ryb25nPjwvdGQ+XG4gICAgICAgICAgICA8dGQ+PHN0cm9uZz4kJHtxdW90ZURhdGEudG90YWwudG9GaXhlZCgyKX08L3N0cm9uZz48L3RkPlxuICAgICAgICAgIDwvdHI+XG4gICAgICAgIDwvdGJvZHk+XG4gICAgICA8L3RhYmxlPlxuICAgICAgPGRpdiBjbGFzcz1cInN1bW1hcnlcIj5cbiAgICAgICAgPHA+PHN0cm9uZz5TdW1tYXJ5Ojwvc3Ryb25nPiAke3F1b3RlRGF0YS5zdW1tYXJ5fTwvcD5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICBgO1xufSJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVYsU0FBUyxvQkFBb0I7QUFDOVcsT0FBTyxXQUFXO0FBRWxCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEsVUFBVSxFQUFFO0FBQUEsTUFDOUM7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBRUEsY0FBYztBQUFBLElBQ1osbUJBQW1CLENBQUMsU0FBUztBQUUzQixZQUFNLGlCQUFpQjtBQUN2QixZQUFNLFFBQVEsS0FBSyxNQUFNLGNBQWM7QUFFdkMsVUFBSSxPQUFPO0FBQ1QsY0FBTSxZQUFZLEtBQUssTUFBTSxNQUFNLEVBQUU7QUFFckMsY0FBTSxZQUFZLG1CQUFtQixTQUFTO0FBRTlDLGVBQU8sS0FBSyxRQUFRLGdCQUFnQixTQUFTO0FBQUEsTUFDL0M7QUFDQSxhQUFPO0FBQUEsSUFDVDtBQUFBLEVBQ0Y7QUFDRixDQUFDO0FBRUQsU0FBUyxtQkFBbUIsV0FBVztBQUNyQyxRQUFNLFlBQVksVUFBVSxNQUFNLElBQUksVUFBUTtBQUFBO0FBQUEsWUFFcEMsS0FBSztBQUFBLFlBQ0wsS0FBSztBQUFBLGFBQ0osS0FBSyxXQUFXLFFBQVEsQ0FBQztBQUFBLGFBQ3pCLEtBQUssTUFBTSxRQUFRLENBQUM7QUFBQTtBQUFBLEdBRTlCLEVBQUUsS0FBSyxFQUFFO0FBRVYsU0FBTztBQUFBO0FBQUE7QUFBQSwyQkFHa0IsVUFBVTtBQUFBLHFCQUNoQixVQUFVO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxZQVduQjtBQUFBO0FBQUE7QUFBQSwyQkFHZSxVQUFVLE1BQU0sUUFBUSxDQUFDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx1Q0FLYixVQUFVO0FBQUE7QUFBQTtBQUFBO0FBSWpEOyIsCiAgIm5hbWVzIjogW10KfQo=
