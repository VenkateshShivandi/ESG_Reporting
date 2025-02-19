# @theamiteshtripathi/supabase

A TypeScript-based Supabase client wrapper with built-in logging and type safety for database operations.

## Features

- Supabase client integration
- Type-safe database operations
- Winston logging integration
- Error handling
- Lead and Quote management
- TypeScript support
- ESM and CommonJS support
- Configurable client options

## Installation
bash
npm install @theamiteshtripathi/supabase


## Dependencies

- @supabase/supabase-js: ^2.x.x
- winston: ^3.x.x

## Configuration
typescript
interface SupabaseConfig {
supabaseUrl: string;
supabaseKey: string;
options?: {
auth?: {
autoRefreshToken?: boolean;
persistSession?: boolean;
};
db?: {
schema?: string;
};
};
}


## Type Definitions
typescript
interface Lead {
id?: string;
fullName: string;
email: string;
phone: string;
company: string;
createdAt?: Date;
}
interface Quote {
id?: string;
customerName: string;
company: string;
items: QuoteItem[];
total: number;
status: 'draft' | 'sent' | 'accepted' | 'rejected';
createdAt?: Date;
}
interface QuoteItem {
name: string;
quantity: number;
unitPrice: number;
total: number;
}


## Usage

### Initialize Supabase Client
typescript
import { SupabaseOperations } from '@theamiteshtripathi/supabase';
const supabase = new SupabaseOperations({
supabaseUrl: 'your-supabase-url',
supabaseKey: 'your-supabase-key'
});


### Database Operations

#### Store Lead
typescript
const lead: Lead = {
fullName: "John Doe",
email: "john@example.com",
phone: "+1234567890",
company: "Acme Inc"
};
try {
const result = await supabase.storeLead(lead);
console.log('Lead stored:', result);
} catch (error) {
console.error('Failed to store lead:', error);
}


#### Store Quote
typescript
const quote: Quote = {
customerName: "Jane Smith",
company: "Tech Corp",
items: [
{
name: "Service A",
quantity: 1,
unitPrice: 100,
total: 100
}
],
total: 100,
status: 'draft'
};
try {
const result = await supabase.storeQuote(quote);
console.log('Quote stored:', result);
} catch (error) {
console.error('Failed to store quote:', error);
}


## Logging

The package uses Winston for logging:
typescript
const logger = winston.createLogger({
level: 'info',
format: winston.format.json(),
transports: [
new winston.transports.Console({
format: winston.format.simple()
})
]
});


## Error Handling
typescript
try {
// Supabase operations
} catch (error) {
logger.error('Operation failed:', {
error,
timestamp: new Date().toISOString()
});
throw error;
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


## License

MIT

## Repository

[GitHub Repository](https://github.com/theamiteshtripathi/SaaSFactory/tree/main/packages/supabase)

## Publishing

This package is published to GitHub Packages registry with restricted access.
