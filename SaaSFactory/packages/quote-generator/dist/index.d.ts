interface QuoteItem$1 {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
}
interface QuoteData$1 {
    customerName: string;
    company: string;
    items: QuoteItem$1[];
    total: number;
    summary: string;
}
interface GenerateQuoteOptions {
    template?: string;
    currency?: string;
    language?: string;
    format?: 'html' | 'pdf' | 'json';
}
interface QuoteGeneratorResult {
    data: QuoteData$1;
    output: string;
    format: string;
}

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
declare class QuoteGenerator {
    private apiClient;
    constructor(apiKey: string);
    generateQuote(prompt: string): Promise<QuoteData>;
    private validateQuoteData;
}

export { GenerateQuoteOptions, QuoteData$1 as QuoteData, QuoteGenerator, QuoteGeneratorResult, QuoteItem$1 as QuoteItem };
