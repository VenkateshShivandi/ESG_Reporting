import { ApiClient } from '@theamiteshtripathi/api-client';
import logger from '../utils/logger';

interface QuoteItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuoteData {
  customer_name: string;
  company: string;
  items: QuoteItem[];
  total: number;
  summary: string;
}

export class QuoteGenerator {
  private apiClient: ApiClient;

  constructor(apiKey: string) {
    this.apiClient = new ApiClient({ apiKey });
  }

  public async generateQuote(prompt: string): Promise<QuoteData> {
    try {
      logger.info('Generating quote from prompt:', prompt);
      const response = await this.apiClient.generateQuote(prompt);
      
      // Validate response data
      this.validateQuoteData(response);
      
      return response;
    } catch (error) {
      logger.error('Error generating quote:', error);
      throw error;
    }
  }

  private validateQuoteData(data: QuoteData): void {
    if (!data.customer_name || !data.company || !Array.isArray(data.items)) {
      throw new Error('Invalid quote data structure');
    }

    data.items.forEach((item: QuoteItem) => {
      if (!item.name || typeof item.quantity !== 'number' || typeof item.unit_price !== 'number') {
        throw new Error('Invalid quote item structure');
      }
    });
  }
}