import type { QuoteData, FormattedQuote, QuoteFormatterOptions } from './types';

export const generateQuoteTable = (
  data: QuoteData, 
  options?: QuoteFormatterOptions
): string => {
  const headers = ['Item', 'Quantity', 'Unit Price', 'Total'];
  const rows = data.items.map(item => [
    item.name,
    item.quantity.toString(),
    `$${item.unit_price.toFixed(2)}`,
    `$${item.total.toFixed(2)}`
  ]);

  // Convert the data to HTML string
  const tableHtml = `
    <table class="${options?.customStyles?.table || ''}">
      <thead>
        <tr>
          ${headers.map(h => `<th class="${options?.customStyles?.header || ''}">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr class="${options?.customStyles?.row || ''}">
            ${row.map(cell => `<td class="${options?.customStyles?.cell || ''}">${cell}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  return tableHtml;
};