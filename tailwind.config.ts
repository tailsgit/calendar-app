import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--color-bg-main)",
                canvas: "var(--color-bg-secondary)",
                primary: {
                    DEFAULT: "var(--color-accent)",
                    hover: "var(--color-accent-hover)",
                },
                secondary: "var(--color-secondary-brand)",
                text: {
                    main: "var(--color-text-main)",
                    secondary: "var(--color-text-secondary)",
                    light: "var(--color-text-light)",
                },
                border: "var(--color-border)",
            },
            borderRadius: {
                lg: "var(--radius-lg)",
                md: "var(--radius-md)",
                sm: "var(--radius-sm)",
            },
            spacing: {
                xl: "var(--spacing-xl)",
                lg: "var(--spacing-lg)",
                md: "var(--spacing-md)",
                sm: "var(--spacing-sm)",
            }
        },
    },
    plugins: [],
};
export default config;
