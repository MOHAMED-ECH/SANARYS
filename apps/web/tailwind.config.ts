import type { Config } from "tailwindcss";
import preset from "@sanarys/design-tokens/tailwind-preset";

const config: Config = {
  presets: [preset as Config],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      maxWidth: {
        content: "1200px",
        prose: "68ch",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.85)", opacity: "0.55" },
          "70%": { transform: "scale(1.35)", opacity: "0" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 300ms cubic-bezier(0.4,0,0.2,1) both",
        "pulse-ring": "pulseRing 2600ms cubic-bezier(0.4,0,0.2,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
