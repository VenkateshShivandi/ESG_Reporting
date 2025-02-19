export interface AirtableConfig {
    apiKey: string;
    baseId: string;
  }
  
  export interface Lead {
    fullName: string;
    phone: string;
    email: string;
    business: string;
  }
  
  export interface QuoteData {
    customerName: string;
    company: string;
    items: QuoteItem[];
    total: number;
    summary: string;
  }
  
  export interface QuoteItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }
  
  export interface AirtableResponse {
    records: Array<{
      id: string;
      fields: Record<string, any>;
    }>;
  }