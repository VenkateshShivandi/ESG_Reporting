# @theamiteshtripathi/quote-generator

A TypeScript-based quote generation service that integrates with API client for generating structured quote data with logging capabilities.

## Features

- AI-powered quote generation
- Input validation
- Structured quote data
- Comprehensive logging
- Error handling
- TypeScript support
- React integration
- ESM and CommonJS support

## Installation
bash
npm install @theamiteshtripathi/quote-generator


## Dependencies

- @theamiteshtripathi/theme
- @theamiteshtripathi/ui-components
- @theamiteshtripathi/api-client
- react: ^18.2.0 (peer dependency)

## Usage

### Initialize Quote Generator
typescript
import { QuoteGenerator } from '@theamiteshtripathi/quote-generator';
const generator = new QuoteGenerator('your-api-key');


### Generate a Quote
typescript
const prompt = "Generate a quote for web development services";
try {
const quote = await generator.generateQuote(prompt);
console.log(quote);
} catch (error) {
console.error('Quote generation failed:', error);
}


## API Reference

### QuoteGenerator Class
typescript
class QuoteGenerator {
constructor(apiKey: string);
generateQuote(prompt: string): Promise<QuoteData>;
validateQuoteData(data: QuoteData): void;
}


### Quote Data Interface
typescript
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


## Logging

The package includes a built-in logger with three levels:
typescript
const logger = {
info: (message: string, ...args: any[]) => void;
error: (message: string, ...args: any[]) => void;
warn: (message: string, ...args: any[]) => void;
};


Example logging usage:

typescript
logger.info("Generating quote from prompt:", prompt);
logger.error("Error generating quote:", error);
logger.warn("Warning message");


## Validation

The package includes comprehensive validation for quote data:
typescript
validateQuoteData(data: QuoteData): void {
if (!data.customer_name || !data.company || !Array.isArray(data.items)) {
throw new Error("Invalid quote data structure");
}
data.items.forEach(item => {
if (!item.name ||
typeof item.quantity !== "number" ||
typeof item.unit_price !== "number") {
throw new Error("Invalid quote item structure");
}
});
}


## Development
bash
Install dependencies
npm install
Build package
npm run build
Development with watch mode
npm run dev
Lint code
npm run lint
Clean build files
npm run clean


## Error Handling

The package includes comprehensive error handling:
typescript
try {
const response = await this.apiClient.generateQuote(prompt);
this.validateQuoteData(response);
return response;
} catch (error) {
logger.error("Error generating quote:", error);
throw error;
}


## License

MIT

## Repository

[GitHub Repository](https://github.com/theamiteshtripathi/SaaSFactory/tree/main/packages/quote-generator)

## Publishing

This package is published to GitHub Packages registry with restricted access.
