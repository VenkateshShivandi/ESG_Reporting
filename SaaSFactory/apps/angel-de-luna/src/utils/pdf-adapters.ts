import type { QuoteData } from '@theamiteshtripathi/pdf-generator';

interface ConsultationData {
  userId: string;
  templateName: string;
  chatHistory: Array<{
    message: string;
    timestamp: string;
    sender: string;
  }>;
}

export const adaptConsultationToQuoteData = (data: ConsultationData): QuoteData => {
  return {
    customer_name: "Consultation Report",
    company: "Virtual Vocational Consultant",
    phone_number: "-",
    items: data.chatHistory.map(chat => ({
      product_code: chat.sender,
      description: chat.message,
      unit_price: 0,
      total: 0
    })),
    subtotal: 0,
    sales_tax: 0,
    total_cost: 0
  };
}; 