export interface SupabaseConfig {
    url: string;
    apiKey: string;
  }
  
  export interface Lead {
    id?: string;
    full_name: string;
    phone: string;
    email: string;
    business: string;
  }
  
  export interface QuoteItem {
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }
  
  export interface Quote {
    id?: string;
    lead_id: string;
    customer_name: string;
    company: string;
    items: QuoteItem[];
    total: number;
    summary: string;
  }