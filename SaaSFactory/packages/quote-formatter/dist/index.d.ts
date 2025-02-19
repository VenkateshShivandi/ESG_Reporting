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
interface FormattedQuote {
    headers: string[];
    rows: string[][];
    summary: {
        customer: string;
        company: string;
        total: string;
        notes: string;
    };
}
interface FormattedQuoteWithTimestamp$1 extends FormattedQuote {
    timestamp: string;
}
interface QuoteFormatterOptions {
    customStyles?: {
        table?: string;
        header?: string;
        row?: string;
        cell?: string;
    };
    dateFormat?: string;
}

interface FormattedQuoteWithTimestamp extends FormattedQuote {
    timestamp: string;
}
declare const formatQuote: (data: QuoteData) => FormattedQuoteWithTimestamp;

declare const generateQuoteTable: (data: QuoteData, options?: QuoteFormatterOptions) => string;

export { FormattedQuote, FormattedQuoteWithTimestamp$1 as FormattedQuoteWithTimestamp, QuoteData, QuoteFormatterOptions, QuoteItem, formatQuote, generateQuoteTable };
