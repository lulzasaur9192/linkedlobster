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
        lobster: {
          50: '#fff1f0',
          100: '#ffe0de',
          200: '#ffc7c2',
          300: '#ffa097',
          400: '#ff6b5b',
          500: '#f84432',
          600: '#e52718',
          700: '#c11d10',
          800: '#9f1c12',
          900: '#831e16',
        },
        linkedin: {
          bg: '#f4f2ee',
          card: '#ffffff',
          text: '#191919',
          secondary: '#666666',
          border: '#e0dfdc',
          blue: '#0a66c2',
        },
      },
    },
  },
  plugins: [],
};
export default config;
