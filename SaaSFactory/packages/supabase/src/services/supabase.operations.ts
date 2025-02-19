import { createClient } from '@supabase/supabase-js';
import { SupabaseConfig, Lead, Quote } from '../types/supabase.types';
import { logger } from '../utils/logger';

export class SupabaseOperations {
  private client: any;

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.apiKey);
  }

  async storeLead(lead: Lead): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('leads')
        .insert(lead)
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      logger.error('Error storing lead:', error);
      throw error;
    }
  }

  async storeQuote(quote: Quote): Promise<string> {
    try {
      const { data: quoteData, error: quoteError } = await this.client
        .from('quotes')
        .insert({
          lead_id: quote.lead_id,
          customer_name: quote.customer_name,
          company: quote.company,
          total: quote.total,
          summary: quote.summary
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const quoteItems = quote.items.map(item => ({
        ...item,
        quote_id: quoteData.id
      }));

      const { error: itemsError } = await this.client
        .from('quote_items')
        .insert(quoteItems);

      if (itemsError) throw itemsError;

      return quoteData.id;
    } catch (error) {
      logger.error('Error storing quote:', error);
      throw error;
    }
  }

  async getPriceList() {
    try {
      const { data, error } = await this.client
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `);

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting price list:', error);
      throw error;
    }
  }
}