import type { Plugin } from 'vite';
import { generateQuoteTable } from './formatter';
import type { QuoteData, FormattedQuote, QuoteFormatterOptions } from './types';

export function quoteFormatterPlugin(options?: QuoteFormatterOptions): Plugin {
  return {
    name: 'quote-formatter',
    transform(code, id) {
      if (id.endsWith('.html') || id.endsWith('.js')) {
        const quoteDataRegex = /QUOTE_DATA_START([\s\S]*?)QUOTE_DATA_END/;
        const match = code.match(quoteDataRegex);
        
        if (match) {
          const quoteData = JSON.parse(match[1]);
          const tableHtml = generateQuoteTable(quoteData, options);
          return code.replace(quoteDataRegex, tableHtml);
        }
      }
      return code;
    }
  };
}

export interface FormattedQuoteWithTimestamp extends FormattedQuote {
  timestamp: string;
}

export const formatQuote = (data: QuoteData): FormattedQuoteWithTimestamp => {
  const formattedData = generateQuoteTable(data);
  return {
    ...JSON.parse(formattedData),
    timestamp: new Date().toISOString()
  };
};