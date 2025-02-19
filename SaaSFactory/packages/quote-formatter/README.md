# @theamiteshtripathi/quote-formatter

A TypeScript package for formatting and styling quote data with theme integration and table generation capabilities.

## Features

- Quote data formatting and validation
- Theme-based styling
- Table generation
- Timestamp handling
- TypeScript type definitions
- React integration
- ESM and CommonJS support

## Installation
bash
npm install @theamiteshtripathi/quote-formatter


## Dependencies

- @theamiteshtripathi/theme
- react: ^18.2.0 (peer dependency)

## Type Definitions
typescript
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
interface FormattedQuote extends QuoteData {
formatted_total: string;
formatted_items: Array<QuoteItem & {
formatted_price: string;
formatted_total: string;
}>;
}
interface FormattedQuoteWithTimestamp extends FormattedQuote {
timestamp: Date;
formatted_date: string;
}
interface QuoteFormatterOptions {
currency?: string;
dateFormat?: string;
theme?: ThemeConfig;
}


## Usage

### Basic Quote Formatting

typescript
import { formatQuote } from '@theamiteshtripathi/quote-formatter';
const quoteData = {
customer_name: "John Doe",
company: "Acme Corp",
items: [
{
name: "Product A",
quantity: 2,
unit_price: 100,
total: 200
}
],
total: 200,
summary: "Sample quote"
};
const formattedQuote = formatQuote(quoteData, {
currency: 'USD',
dateFormat: 'MM/DD/YYYY'
});


### Generate Quote Table
typescript
import { generateQuoteTable } from '@theamiteshtripathi/quote-formatter';
const tableHtml = generateQuoteTable(formattedQuote, {
theme: {
colors: {
primary: '#007bff',
secondary: '#6c757d'
},
fonts: {
main: 'Arial'
}
}
});


## API Reference

### formatQuote
typescript
function formatQuote(
data: QuoteData,
options?: QuoteFormatterOptions
): FormattedQuoteWithTimestamp


### generateQuoteTable
typescript
function generateQuoteTable(
quote: FormattedQuote,
options?: QuoteFormatterOptions
): string


## Theme Integration

The package uses `@theamiteshtripathi/theme` for consistent styling:
typescript
interface ThemeConfig {
colors: {
primary: string;
secondary: string;
background?: string;
text?: string;
};
fonts: {
main: string;
secondary?: string;
};
spacing?: {
unit: number;
};
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



## Examples

### Custom Formatting with Theme
typescript
import { formatQuote, generateQuoteTable } from '@theamiteshtripathi/quote-formatter';
const formattedQuote = formatQuote(quoteData, {
currency: 'EUR',
dateFormat: 'DD/MM/YYYY',
theme: {
colors: {
primary: '#2196f3',
secondary: '#f50057',
background: '#ffffff',
text: '#000000'
},
fonts: {
main: 'Roboto',
secondary: 'Arial'
},
spacing: {
unit: 8
}
}
});


## Error Handling

The package includes validation and error handling for quote data:
typescript
try {
const formatted = formatQuote(quoteData);
} catch (error) {
console.error('Quote formatting failed:', error);
}


## License

MIT

## Repository

[GitHub Repository](https://github.com/theamiteshtripathi/SaaSFactory/tree/main/packages/quote-formatter)

## Publishing

This package is published to GitHub Packages registry with restricted access.
