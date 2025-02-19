export interface QuoteItem {
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }
  
  export interface QuoteData {
    customer_name: string;
    company: string;
    items: QuoteItem[];
    total: number;
    summary: string;
  }
  
  export interface FormattedQuote {
    headers: string[];
    rows: string[][];
    summary: {
      customer: string;
      company: string;
      total: string;
      notes: string;
    };
  }
  
  export interface FormattedQuoteWithTimestamp extends FormattedQuote {
    timestamp: string;
  }
  
  export interface QuoteFormatterOptions {
    customStyles?: {
      table?: string;
      header?: string;
      row?: string;
      cell?: string;
    };
    dateFormat?: string;
  }