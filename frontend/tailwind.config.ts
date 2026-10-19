import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cesi: {
          jaune: "#FFD500",
          noir: "#0A0A0A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
