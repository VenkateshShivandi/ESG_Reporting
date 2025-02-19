interface ApiConfig {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    assistantId?: string;
    organizationId?: string;
}
interface QuoteData {
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
declare class ApiClient {
    private openai;
    private model;
    private maxTokens;
    private temperature;
    private assistantId;
    private organizationId;
    constructor(config: ApiConfig);
    private checkOpenAIVersion;
    private compareVersions;
    chat(message: string): Promise<string>;
    generateQuote(prompt: string): Promise<QuoteData>;
}

export { ApiClient };
