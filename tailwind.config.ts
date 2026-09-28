import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0D1B2A",
        "navy-800": "#102436",
        mint: "#B8E8DC",
        sky: "#C9E0EC",
        paper: "#F4F5F5",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        eyebrow: "0.22em",
      },
      backgroundImage: {
        "mint-gradient":
          "linear-gradient(120deg, #B8E8DC 0%, #CDE7E2 45%, #C9E0EC 100%)",
        "navy-gradient":
          "radial-gradient(120% 120% at 80% 0%, #12405A 0%, #0D1B2A 55%, #0A1622 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
