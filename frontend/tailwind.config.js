/** @type {import('tailwindcss').Config} */
module.exports = {
    blocklist: ["overline"],
    darkMode: ["class"],
    // Safelist to keep dynamic color classes used by JSX from being purged in production
    safelist: [
        { pattern: /(bg|text|border|ring|from|to)-(indigo|cyan|emerald|amber|rose|violet|slate|orange|red)-(50|100|200|300|400|500|600|700|800|900)(\/[0-9]+)?/ },
    ],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
                primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
            }
        }
    },
    plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
