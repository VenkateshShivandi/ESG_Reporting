# @theamiteshtripathi/ui-components

A React-based UI components library with TypeScript support and theme integration for the SaaS Factory ecosystem.

## Features

- React components library
- Theme integration
- TypeScript support
- ESM and CommonJS support
- Responsive design
- Accessibility support
- Component customization
- Consistent styling

## Installation
bash
npm install @theamiteshtripathi/ui-components



## Dependencies

- @theamiteshtripathi/theme
- react: ^18.2.0 (peer dependency)

## Usage

### Basic Component Usage
typescript
import { Button, Input, Card } from '@theamiteshtripathi/ui-components';
function MyComponent() {
return (
<Card>
<Input placeholder="Enter text" />
<Button variant="primary">Submit</Button>
</Card>
);
}


### Theme Integration

The components automatically integrate with `@theamiteshtripathi/theme`:
typescript
import { ThemeProvider } from '@theamiteshtripathi/theme';
import { Button } from '@theamiteshtripathi/ui-components';
function App() {
return (
<ThemeProvider>
<Button
variant="primary"
size="large"
>
Themed Button
</Button>
</ThemeProvider>
);
}


## Available Components

### Button
typescript
interface ButtonProps {
variant?: 'primary' | 'secondary' | 'outline';
size?: 'small' | 'medium' | 'large';
disabled?: boolean;
onClick?: () => void;
children: React.ReactNode;
}


### Input
typescript
interface InputProps {
type?: 'text' | 'number' | 'email' | 'password';
placeholder?: string;
value?: string;
onChange?: (value: string) => void;
error?: string;
disabled?: boolean;
}


### Card
typescript
interface CardProps {
elevation?: 'none' | 'low' | 'medium' | 'high';
padding?: 'none' | 'small' | 'medium' | 'large';
children: React.ReactNode;
}


### Theme Integration

Components use the theme tokens from `@theamiteshtripathi/theme`:
typescript
// Theme usage in components
{
colors: {
primary: '#F8912E',
primaryHover: '#FEE846',
primaryDark: '#D67B1D'
}
}


Reference to theme configuration:
typescript:packages/theme/src/styles/index.ts
startLine: 3
endLine: 34


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


## Component Customization

Components can be customized using theme overrides:
typescript
import { Button } from '@theamiteshtripathi/ui-components';
const customStyles = {
backgroundColor: 'custom-color',
padding: '12px 24px',
borderRadius: '8px'
};
<Button style={customStyles}>
Custom Button
</Button>


## License

MIT

## Repository

[GitHub Repository](https://github.com/theamiteshtripathi/SaaSFactory/tree/main/packages/ui-components)

## Publishing

This package is published to GitHub Packages registry with restricted access.
