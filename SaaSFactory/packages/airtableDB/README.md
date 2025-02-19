# @theamiteshtripathi/airtabledb

A TypeScript package for Airtable operations with built-in type safety, error handling, and logging capabilities.

## Features

- Type-safe Airtable API operations
- Built-in error handling and logging
- Axios-based HTTP requests
- Environment variable support
- Winston logging integration
- Configurable retry attempts and timeouts

## Installation

npm install @theamiteshtripathi/airtabledb

## Configuration

The package requires the following configuration:
typescript
interface AirtableConfig {
apiKey: string;
baseId: string;
}


Default configuration options (can be overridden):
typescript
const defaultConfig = {
retryAttempts: 3,
requestTimeout: 10000,
tables: {
leads: 'Leads',
quotes: 'Quotes'
}
};


## Usage

### Initialize AirtableDB
typescript
import { AirtableOperations } from '@theamiteshtripathi/airtabledb';
const airtable = new AirtableOperations({
apiKey: 'your_airtable_api_key',
baseId: 'your_base_id'
});


### Store a Lead
typescript
interface Lead {
fullName: string;
phone: string;
email: string;
business: string;
}
const lead: Lead = {
fullName: "John Doe",
phone: "+1234567890",
email: "john@example.com",
business: "Acme Corp"
};
try {
const leadId = await airtable.storeLead(lead);
console.log('Lead stored with ID:', leadId);
} catch (error) {
console.error('Error storing lead:', error);
}


### Data Types

#### Lead Interface
typescript
interface Lead {
fullName: string;
phone: string;
email: string;
business: string;
}


#### Quote Data Interface
typescript
interface QuoteData {
customerName: string;
company: string;
items: QuoteItem[];
total: number;
summary: string;
}
interface QuoteItem {
name: string;
quantity: number;
unitPrice: number;
total: number;
}


#### Airtable Response Interface

typescript
interface AirtableResponse {
records: Array<{
id: string;
fields: Record<string, any>;
}>;
}


## Error Handling

The package includes comprehensive error handling:
typescript
try {
// Airtable operations
} catch (error) {
logger.error('Operation failed:', error);
throw error;
}


## Development

bash
Install dependencies
npm install
Build the package
npm run build
Watch mode
npm run dev
Clean build files
npm run clean


## Environment Variables

Create a `.env` file in your project root:
env
AIRTABLE_API_KEY=your_api_key
AIRTABLE_BASE_ID=your_base_id


## Dependencies

- airtable: ^0.12.0
- dotenv: ^16.4.5
- axios: ^1.7.7
- winston: ^3.x.x

## License

MIT

## Author

Amitesh Tripathi