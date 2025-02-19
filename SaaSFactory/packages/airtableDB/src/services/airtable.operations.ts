import axios from 'axios';
import { AirtableConfig, Lead, QuoteData, AirtableResponse } from '../types/airtable.types';
import { logger } from '../utils/logger';

export class AirtableOperations {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(private config: AirtableConfig) {
    this.baseUrl = `https://api.airtable.com/v0/${config.baseId}`;
    this.headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async storeLead(lead: Lead): Promise<string> {
    try {
      const response = await axios.post<AirtableResponse>(
        `${this.baseUrl}/Leads`,
        {
          records: [{
            fields: {
              'Full Name': lead.fullName,
              'Phone': lead.phone,
              'Email': lead.email,
              'Business': lead.business
            }
          }]
        },
        { headers: this.headers }
      );

      return response.data.records[0].id;
    } catch (error) {
      logger.error('Error storing lead:', error);
      throw error;
    }
  }

}