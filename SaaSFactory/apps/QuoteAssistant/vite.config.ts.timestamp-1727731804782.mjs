// vite.config.ts
import { defineConfig } from "file:///Users/amiteshtripathi/Documents/GAMAN/QuoteAssistant/node_modules/vite/dist/node/index.js";
import react from "file:///Users/amiteshtripathi/Documents/GAMAN/QuoteAssistant/node_modules/@vitejs/plugin-react/dist/index.mjs";
var quoteFormatterPlugin = {
  name: "quote-formatter",
  transform(code, id) {
    if (id.endsWith(".html") || id.endsWith(".js")) {
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
var vite_config_default = defineConfig({
  plugins: [react(), quoteFormatterPlugin],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYW1pdGVzaHRyaXBhdGhpL0RvY3VtZW50cy9HQU1BTi9RdW90ZUFzc2lzdGFudFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2FtaXRlc2h0cmlwYXRoaS9Eb2N1bWVudHMvR0FNQU4vUXVvdGVBc3Npc3RhbnQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2FtaXRlc2h0cmlwYXRoaS9Eb2N1bWVudHMvR0FNQU4vUXVvdGVBc3Npc3RhbnQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIFBsdWdpbiB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5cbmNvbnN0IHF1b3RlRm9ybWF0dGVyUGx1Z2luOiBQbHVnaW4gPSB7XG4gIG5hbWU6ICdxdW90ZS1mb3JtYXR0ZXInLFxuICB0cmFuc2Zvcm0oY29kZSwgaWQpIHtcbiAgICBpZiAoaWQuZW5kc1dpdGgoJy5odG1sJykgfHwgaWQuZW5kc1dpdGgoJy5qcycpKSB7XG4gICAgICAvLyBZb3VyIGV4aXN0aW5nIHF1b3RlIGZvcm1hdHRpbmcgbG9naWMgaGVyZVxuICAgICAgY29uc3QgcXVvdGVEYXRhUmVnZXggPSAvUVVPVEVfREFUQV9TVEFSVChbXFxzXFxTXSo/KVFVT1RFX0RBVEFfRU5ELztcbiAgICAgIGNvbnN0IG1hdGNoID0gY29kZS5tYXRjaChxdW90ZURhdGFSZWdleCk7XG4gICAgICBcbiAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICBjb25zdCBxdW90ZURhdGEgPSBKU09OLnBhcnNlKG1hdGNoWzFdKTtcbiAgICAgICAgY29uc3QgdGFibGVIdG1sID0gZ2VuZXJhdGVRdW90ZVRhYmxlKHF1b3RlRGF0YSk7XG4gICAgICAgIHJldHVybiBjb2RlLnJlcGxhY2UocXVvdGVEYXRhUmVnZXgsIHRhYmxlSHRtbCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb2RlO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgcXVvdGVGb3JtYXR0ZXJQbHVnaW5dLFxuICBzZXJ2ZXI6IHtcbiAgICAvL2hvc3Q6IFwiMC4wLjAuMFwiLFxuICAgIC8vcG9ydDogODA4MCxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xMjcuMC4wLjE6ODA4MCcsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaS8sICcnKVxuICAgICAgfVxuICAgIH1cbiAgfVxufSlcblxuLy8gS2VlcCB0aGUgZ2VuZXJhdGVRdW90ZVRhYmxlIGZ1bmN0aW9uIGFzIGlzXG5mdW5jdGlvbiBnZW5lcmF0ZVF1b3RlVGFibGUocXVvdGVEYXRhKSB7XG4gIGNvbnN0IGl0ZW1zSHRtbCA9IHF1b3RlRGF0YS5pdGVtcy5tYXAoaXRlbSA9PiBgXG4gICAgPHRyPlxuICAgICAgPHRkPiR7aXRlbS5uYW1lfTwvdGQ+XG4gICAgICA8dGQ+JHtpdGVtLnF1YW50aXR5fTwvdGQ+XG4gICAgICA8dGQ+JCR7aXRlbS51bml0X3ByaWNlLnRvRml4ZWQoMil9PC90ZD5cbiAgICAgIDx0ZD4kJHtpdGVtLnRvdGFsLnRvRml4ZWQoMil9PC90ZD5cbiAgICA8L3RyPlxuICBgKS5qb2luKCcnKTtcblxuICByZXR1cm4gYFxuICAgIDxkaXYgY2xhc3M9XCJxdW90ZS1jb250YWluZXJcIj5cbiAgICAgIDxoMj5RdW90ZSBEZXRhaWxzPC9oMj5cbiAgICAgIDxoMj5DdXN0b21lciBOYW1lOiAke3F1b3RlRGF0YS5jdXN0b21lcl9uYW1lfTwvaDI+XG4gICAgICA8aDI+Q29tcGFueTogJHtxdW90ZURhdGEuY29tcGFueX08L2gyPlxuICAgICAgPHRhYmxlPlxuICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgPHRyPlxuICAgICAgICAgICAgPHRoPkl0ZW0gRGVzY3JpcHRpb248L3RoPlxuICAgICAgICAgICAgPHRoPlF1YW50aXR5PC90aD5cbiAgICAgICAgICAgIDx0aD5Vbml0IFByaWNlPC90aD5cbiAgICAgICAgICAgIDx0aD5Ub3RhbDwvdGg+XG4gICAgICAgICAgPC90cj5cbiAgICAgICAgPC90aGVhZD5cbiAgICAgICAgPHRib2R5PlxuICAgICAgICAgICR7aXRlbXNIdG1sfVxuICAgICAgICAgIDx0ciBjbGFzcz1cInRvdGFsLXJvd1wiPlxuICAgICAgICAgICAgPHRkIGNvbHNwYW49XCIzXCI+PHN0cm9uZz5Ub3RhbDo8L3N0cm9uZz48L3RkPlxuICAgICAgICAgICAgPHRkPjxzdHJvbmc+JCR7cXVvdGVEYXRhLnRvdGFsLnRvRml4ZWQoMil9PC9zdHJvbmc+PC90ZD5cbiAgICAgICAgICA8L3RyPlxuICAgICAgICA8L3Rib2R5PlxuICAgICAgPC90YWJsZT5cbiAgICAgIDxkaXYgY2xhc3M9XCJzdW1tYXJ5XCI+XG4gICAgICAgIDxwPjxzdHJvbmc+U3VtbWFyeTo8L3N0cm9uZz4gJHtxdW90ZURhdGEuc3VtbWFyeX08L3A+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgYDtcbn0iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlWLFNBQVMsb0JBQTRCO0FBQ3RYLE9BQU8sV0FBVztBQUVsQixJQUFNLHVCQUErQjtBQUFBLEVBQ25DLE1BQU07QUFBQSxFQUNOLFVBQVUsTUFBTSxJQUFJO0FBQ2xCLFFBQUksR0FBRyxTQUFTLE9BQU8sS0FBSyxHQUFHLFNBQVMsS0FBSyxHQUFHO0FBRTlDLFlBQU0saUJBQWlCO0FBQ3ZCLFlBQU0sUUFBUSxLQUFLLE1BQU0sY0FBYztBQUV2QyxVQUFJLE9BQU87QUFDVCxjQUFNLFlBQVksS0FBSyxNQUFNLE1BQU0sRUFBRTtBQUNyQyxjQUFNLFlBQVksbUJBQW1CLFNBQVM7QUFDOUMsZUFBTyxLQUFLLFFBQVEsZ0JBQWdCLFNBQVM7QUFBQSxNQUMvQztBQUFBLElBQ0Y7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxvQkFBb0I7QUFBQSxFQUN2QyxRQUFRO0FBQUEsSUFHTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEsVUFBVSxFQUFFO0FBQUEsTUFDOUM7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7QUFHRCxTQUFTLG1CQUFtQixXQUFXO0FBQ3JDLFFBQU0sWUFBWSxVQUFVLE1BQU0sSUFBSSxVQUFRO0FBQUE7QUFBQSxZQUVwQyxLQUFLO0FBQUEsWUFDTCxLQUFLO0FBQUEsYUFDSixLQUFLLFdBQVcsUUFBUSxDQUFDO0FBQUEsYUFDekIsS0FBSyxNQUFNLFFBQVEsQ0FBQztBQUFBO0FBQUEsR0FFOUIsRUFBRSxLQUFLLEVBQUU7QUFFVixTQUFPO0FBQUE7QUFBQTtBQUFBLDJCQUdrQixVQUFVO0FBQUEscUJBQ2hCLFVBQVU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBV25CO0FBQUE7QUFBQTtBQUFBLDJCQUdlLFVBQVUsTUFBTSxRQUFRLENBQUM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHVDQUtiLFVBQVU7QUFBQTtBQUFBO0FBQUE7QUFJakQ7IiwKICAibmFtZXMiOiBbXQp9Cg==
