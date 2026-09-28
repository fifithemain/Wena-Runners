import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        asphalt: "#0D0D0D",
        steel: "#1B1B1B",
        runnerred: "#CC0000",
        hustlegold: "#FFBD59",
        bone: "#F5F1E8",
        ink: "#141414",
      },
      fontFamily: {
        display: ["var(--font-anton)"],
        body: ["var(--font-montserrat)"],
      },
    },
  },
  plugins: [],
};
export default config;
