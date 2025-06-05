import type { Config } from "tailwindcss";

// Define a type for the theme helper function
type ThemeHelper = (path: string) => any;

export default {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	container: {
  		center: true,
  		padding: "2rem",
  		screens: {
  			"2xl": "1400px",
  		},
  	},
  	extend: {
  		colors: {
  			border: "hsl(var(--border))",
  			input: "hsl(var(--input))",
  			ring: "hsl(var(--ring))",
  			background: "hsl(var(--background))",
  			foreground: "hsl(var(--foreground))",
  			primary: {
  				DEFAULT: "hsl(var(--primary))",
  				foreground: "hsl(var(--primary-foreground))",
  			},
  			secondary: {
  				DEFAULT: "hsl(var(--secondary))",
  				foreground: "hsl(var(--secondary-foreground))",
  			},
  			destructive: {
  				DEFAULT: "hsl(var(--destructive))",
  				foreground: "hsl(var(--destructive-foreground))",
  			},
  			muted: {
  				DEFAULT: "hsl(var(--muted))",
  				foreground: "hsl(var(--muted-foreground))",
  			},
  			accent: {
  				DEFAULT: "hsl(var(--accent))",
  				foreground: "hsl(var(--accent-foreground))",
  			},
  			popover: {
  				DEFAULT: "hsl(var(--popover))",
  				foreground: "hsl(var(--popover-foreground))",
  			},
  			card: {
  				DEFAULT: "hsl(var(--card))",
  				foreground: "hsl(var(--card-foreground))",
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: "var(--radius)",
  			md: "calc(var(--radius) - 2px)",
  			sm: "calc(var(--radius) - 4px)",
  		},
  		keyframes: {
  			"accordion-down": {
  				from: { height: "0" },
  				to: { height: "var(--radix-accordion-content-height)" },
  			},
  			"accordion-up": {
  				from: { height: "var(--radix-accordion-content-height)" },
  				to: { height: "0" },
  			},
        "bounce-short": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10%)" },
        },
        "bounce-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15%)" },
        },
        "sway": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          "to": { transform: "rotate(360deg)" },
        },
        "count-up": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
  		},
  		animation: {
  			"accordion-down": "accordion-down 0.2s ease-out",
  			"accordion-up": "accordion-up 0.2s ease-out",
        "bounce-short": "bounce-short 1s ease-in-out infinite",
        "bounce-slow": "bounce-slow 3s ease-in-out infinite",
        "sway": "sway 3s ease-in-out infinite",
        "fade-in": "fade-in 0.6s ease-out",
        "spin-slow": "spin-slow 8s linear infinite",
        "count-up": "count-up 1s ease-out",
  		},
  		typography: ({ theme }: { theme: ThemeHelper }) => ({
  			emerald: {
  				css: {
  					'--tw-prose-body': theme('colors.slate[700]'),
  					'--tw-prose-headings': theme('colors.emerald[700]'),
  					'--tw-prose-links': theme('colors.emerald[600]'),
  					h1: {
  						fontWeight: '700',
  						fontSize: theme('fontSize.3xl'),
  						color: theme('colors.emerald[700]'),
  						marginTop: theme('spacing.8'),
  						marginBottom: theme('spacing.4'),
  					},
  					h2: {
  						fontWeight: '600',
  						fontSize: theme('fontSize.2xl'),
  						color: theme('colors.emerald[700]'),
  						marginTop: theme('spacing.6'),
  						marginBottom: theme('spacing.3'),
  					},
  					h3: {
  						fontWeight: '600',
  						fontSize: theme('fontSize.xl'),
  						color: theme('colors.emerald[700]'),
  						marginTop: theme('spacing.5'),
  						marginBottom: theme('spacing.2'),
  					},
  					h4: {
  						fontWeight: '600',
  						fontSize: theme('fontSize.lg'),
  						color: theme('colors.emerald[700]'),
  						marginTop: theme('spacing.4'),
  						marginBottom: theme('spacing.2'),
  					},
  					p: {
  						marginTop: theme('spacing.4'),
  						marginBottom: theme('spacing.4'),
  						lineHeight: theme('lineHeight.relaxed'),
  					},
  				},
  			},
  		}),
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
  ],
} satisfies Config;
