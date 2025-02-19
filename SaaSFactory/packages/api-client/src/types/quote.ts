export interface QuoteItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }
  
  export interface QuoteRequest {
    customerName: string;
    company: string;
    items: QuoteItem[];
  }
  
  export interface QuoteResponse {
    customerName: string;
    company: string;
    items: QuoteItem[];
    total: number;
    summary: string;
  }