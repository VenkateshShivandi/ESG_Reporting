# @theamiteshtripathi/pdf-generator

A React-based PDF generation package with TypeScript support, built on top of jsPDF for creating customizable PDF documents.

## Features

- PDF document generation
- React integration
- TypeScript support
- Custom styling options
- Page layout customization
- Text formatting capabilities
- Image embedding support
- Table generation
- Document metadata management

## Installation
bash
npm install @theamiteshtripathi/pdf-generator


## Dependencies

- jspdf: ^2.5.1
- react: >=18.0.0 (peer dependency)

## Usage

### Basic PDF Generation
typescript
import { PDFGenerator } from '@theamiteshtripathi/pdf-generator';
const generator = new PDFGenerator({
format: 'a4',
orientation: 'portrait'
});
// Generate simple PDF
generator.createDocument({
title: 'Sample Document',
content: 'Hello World!'
});


### Document Configuration
typescript
interface PDFConfig {
format?: 'a4' | 'a3' | 'letter' | [number, number];
orientation?: 'portrait' | 'landscape';
unit?: 'mm' | 'pt' | 'px' | 'in' | 'cm';
margins?: {
top: number;
right: number;
bottom: number;
left: number;
};
}


### Advanced Usage
typescript
interface DocumentContent {
title: string;
author?: string;
subject?: string;
content: ContentBlock[];
}
interface ContentBlock {
type: 'text' | 'image' | 'table';
data: any;
style?: StyleOptions;
}
// Example usage
const doc = await generator.createDocument({
title: 'Business Report',
author: 'John Doe',
content: [
{
type: 'text',
data: 'Annual Report 2024',
style: {
fontSize: 18,
bold: true,
align: 'center'
}
},
{
type: 'table',
data: {
headers: ['Item', 'Value'],
rows: [
['Revenue', '$100,000'],
['Expenses', '$75,000']
]
}
}
]
});


### Styling Options
typescript
interface StyleOptions {
fontSize?: number;
fontFamily?: string;
textColor?: string;
align?: 'left' | 'center' | 'right';
bold?: boolean;
italic?: boolean;
lineHeight?: number;
margins?: {
top?: number;
bottom?: number;
};
}


## API Reference

### Methods

#### createDocument
Creates a new PDF document with the specified content and configuration.

typescript
createDocument(content: DocumentContent, config?: PDFConfig): Promise<Blob>


#### addPage
Adds a new page to the current document.


typescript
addPage(orientation?: 'portrait' | 'landscape'): void


#### saveDocument
Saves the current document with the specified filename.

typescript
saveDocument(filename: string): void


## Development
bash
Install dependencies
npm install
Build package
npm run build
Development with watch mode
npm run dev
Prepare for publishing
npm run prepare


## Error Handling
typescript
try {
const pdf = await generator.createDocument(content);
} catch (error) {
console.error('PDF generation failed:', error);
}


## Examples

### Creating a Quote PDF
typescript
const generateQuotePDF = async (quoteData) => {
const generator = new PDFGenerator();
await generator.createDocument({
title: 'Business Quote',
content: [
{
type: 'text',
data: Quote for ${quoteData.customerName},
style: { fontSize: 16, bold: true }
},
{
type: 'table',
data: {
headers: ['Item', 'Quantity', 'Price', 'Total'],
rows: quoteData.items.map(item => [
item.name,
item.quantity.toString(),
$${item.price},
$${item.total}
])
}
}
]
});
};


## License

ISC

## Repository

[GitHub Repository](https://github.com/theamiteshtripathi/SaaSFactory/tree/main/packages/pdf-generator)

## Publishing

This package is published to GitHub Packages registry.
