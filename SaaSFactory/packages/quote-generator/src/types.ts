export interface QuoteItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuoteData {
  customerName: string;
  company: string;
  items: QuoteItem[];
  total: number;
  summary: string;
}

export interface GenerateQuoteOptions {
  template?: string;
  currency?: string;
  language?: string;
  format?: 'html' | 'pdf' | 'json';
}

export interface QuoteGeneratorResult {
  data: QuoteData;
  output: string;
  format: string;
}