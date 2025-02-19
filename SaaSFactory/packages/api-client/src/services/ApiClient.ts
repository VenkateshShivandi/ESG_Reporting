import OpenAI from 'openai';
import { VERSION } from 'openai/version';

// Define MessageProps locally instead of importing
export interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ApiConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  assistantId?: string;
  organizationId?: string;
}

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface QuoteData {
  customer_name: string;
  company: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  total: number;
  summary: string;
}

export class ApiClient {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private assistantId: string;
  private organizationId: string;

  constructor(config: ApiConfig) {
    this.checkOpenAIVersion();
    
    this.openai = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY
    });
    this.model = config.model || 'gpt-4';
    this.maxTokens = config.maxTokens || 1000;
    this.temperature = config.temperature || 0.7;
    this.assistantId = config.assistantId || '';
    this.organizationId = config.organizationId || '';
  }

  private checkOpenAIVersion() {
    const requiredVersion = '1.35.0';
    const currentVersion = VERSION;
    
    if (this.compareVersions(currentVersion, requiredVersion) < 0) {
      throw new Error(`OpenAI version ${currentVersion} is not supported. Please upgrade to ${requiredVersion}`);
    }
  }

  private compareVersions(a: string, b: string): number {
    const pa = a.split('.');
    const pb = b.split('.');
    for (let i = 0; i < 3; i++) {
      const na = Number(pa[i]);
      const nb = Number(pb[i]);
      if (na > nb) return 1;
      if (nb > na) return -1;
      if (!isNaN(na) && isNaN(nb)) return 1;
      if (isNaN(na) && !isNaN(nb)) return -1;
    }
    return 0;
  }

  public async chat(message: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: message }],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Chat error: ${error.message}`);
      }
      throw new Error('An unknown error occurred during chat');
    }
  }

  public async generateQuote(prompt: string): Promise<QuoteData> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from OpenAI');

      return JSON.parse(content) as QuoteData;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Quote generation error: ${error.message}`);
      }
      throw new Error('An unknown error occurred during quote generation');
    }
  }
}