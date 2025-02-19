export interface QuoteData {
    customer_name: string;
    company: string;
    phone_number: string;
    items: {
      product_code: string;
      description: string;
      unit_price: number;
      total: number;
    }[];
    subtotal: number;
    sales_tax: number;
    total_cost: number;
    userId?: string;
    templateName?: string;
  }
  
export interface PDFGeneratorOptions {
    orientation?: 'portrait' | 'landscape';
    format?: string;
  }
  export interface PdfConfig {
    format?: 'a4' | 'letter' | 'legal';
    orientation?: 'portrait' | 'landscape';
    unit?: 'mm' | 'pt' | 'px';
  }
  
  export interface PdfContent {
    title?: string;
    content: string;
    footer?: string;
    metadata?: Record<string, string>;
  }

export interface ConsultationReportData {
    userId: string;
    templateName: string;
    // Add other fields you need for consultation reports
}

// Then modify the PDFOperations class to include a new method
export class PDFOperations {
    static async generateConsultationPDF(data: ConsultationReportData) {
        // Implementation for consultation report
    }
    
    static async generateQuotePDF(quoteData: QuoteData) {
        // Existing implementation
    }
}