# @theamiteshtripathi/theme

A TypeScript-based theme provider package that implements consistent styling and theming across the SaaS Factory packages.

## Features

- Centralized theme management
- TypeScript support
- Color scheme management
- Typography system
- Spacing utilities
- Responsive breakpoints
- Theme context provider
- ESM and CommonJS support

## Installation
bash
npm install @theamiteshtripathi/theme


## Dependencies

- react: ^18.2.0 (peer dependency)

## Theme Configuration
typescript
interface ThemeConfig {
colors: {
primary: string;
secondary: string;
background: string;
text: string;
// Add other color tokens
};
typography: {
fontFamilies: {
main: string;
secondary: string;
};
fontSizes: {
small: string;
medium: string;
large: string;
// Add other size tokens
};
};
spacing: {
unit: number;
small: number;
medium: number;
large: number;
};
breakpoints: {
mobile: string;
tablet: string;
desktop: string;
};
}


## Usage

### Theme Provider Setup
typescript
import { ThemeProvider, defaultTheme } from '@theamiteshtripathi/theme';
function App() {
return (
<ThemeProvider theme={defaultTheme}>
{/ Your app components /}
</ThemeProvider>
);
}


### Using Theme in Components
typescript
import { useTheme } from '@theamiteshtripathi/theme';
function MyComponent() {
const theme = useTheme();
return (
<div style={{
color: theme.colors.primary,
fontFamily: theme.typography.fontFamilies.main,
padding: theme.spacing.medium
}}>
Themed Component
</div>
);
}


### Custom Theme
typescript
const customTheme: ThemeConfig = {
colors: {
primary: '#2196f3',
secondary: '#f50057',
background: '#ffffff',
text: '#000000'
},
typography: {
fontFamilies: {
main: 'Roboto',
secondary: 'Arial'
},
fontSizes: {
small: '12px',
medium: '16px',
large: '24px'
}
},
spacing: {
unit: 8,
small: 8,
medium: 16,
large: 24
},
breakpoints: {
mobile: '320px',
tablet: '768px',
desktop: '1024px'
}
};


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

[GitHub Repository](https://github.com/theamiteshtripathi/SaaSFactory/tree/main/packages/theme)

## Publishing

This package is published to GitHub Packages registry with restricted access.
