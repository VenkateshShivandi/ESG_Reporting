# @theamiteshtripathi/api-client

A TypeScript-based API client package with OpenAI integration for chat and quote generation capabilities.

## Features

- OpenAI API integration with version checking
- Chat completion functionality
- Quote generation with structured response
- Configurable model parameters
- Built-in error handling
- TypeScript support
- ESM and CommonJS support

## Installation
```bash
npm install @theamiteshtripathi/api-client
```


## Configuration

The API client accepts the following configuration options:
typescript
interface ApiConfig {
apiKey: string; // OpenAI API key
model?: string; // Default: 'gpt-4'
maxTokens?: number; // Default: 1000
temperature?: number; // Default: 0.7
assistantId?: string; // Optional
organizationId?: string; // Optional
}


## Usage

### Initialize API Client
typescript
import { ApiClient } from '@theamiteshtripathi/api-client';
const client = new ApiClient({
apiKey: 'your-openai-api-key',
model: 'gpt-4', // optional
maxTokens: 1000, // optional
temperature: 0.7 // optional
});


### Chat Completion
typescript
try {
const response = await client.chat('Your message here');
console.log(response);
} catch (error) {
console.error('Chat error:', error);
}


### Generate Quote
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
try {
const quote = await client.generateQuote('Generate a quote for...');
console.log(quote);
} catch (error) {
console.error('Quote generation error:', error);
}



## Error Handling

The package includes comprehensive error handling for:
- OpenAI API version compatibility
- API request failures
- Response validation
- JSON parsing errors

Example error handling:
typescript
try {
// API operations
} catch (error) {
if (error instanceof Error) {
console.error(Operation failed: ${error.message});
}
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


## Environment Variables
bash
OPENAI_API_KEY=your_openai_api_key


## Dependencies

- openai: ^4.56.0

## License

MIT

## Repository

[GitHub Repository](https://github.com/theamiteshtripathi/SaaSFactory/tree/main/packages/api-client)

## Publishing

This package is published to GitHub Packages registry with restricted access.

json
{
"publishConfig": {
"registry": "https://npm.pkg.github.com",
"access": "restricted"
}
}
