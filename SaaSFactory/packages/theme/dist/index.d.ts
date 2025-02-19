import { Config } from 'tailwindcss';

interface ThemeConfig {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    fonts: {
        heading: string;
        body: string;
    };
    spacing: {
        [key: string]: string;
    };
}

declare const tailwindConfig: Config;

export { ThemeConfig, tailwindConfig };
