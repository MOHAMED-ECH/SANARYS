import type { Config } from "tailwindcss";
import { color, font, radius, shadow, space, breakpoint } from "./tokens.js";

/**
 * Preset Tailwind partage. Toute application front (site public, futur portail/ops)
 * doit consommer ce preset pour garantir une identite visuelle unique (cf. cahier
 * des charges, section 13.2 "Design system").
 */
const preset: Partial<Config> = {
  darkMode: "class",
  theme: {
    screens: breakpoint,
    extend: {
      colors: {
        navy: color.navy,
        petrol: color.petrol,
        copper: color.copper,
        sand: color.sand,
        mist: color.mist,
        slate: color.slate,
        success: color.status.success,
        warning: color.status.warning,
        danger: color.status.danger,
      },
      fontFamily: {
        heading: font.heading.split(",").map((f) => f.trim()),
        body: font.body.split(",").map((f) => f.trim()),
        arabic: font.arabic.split(",").map((f) => f.trim()),
      },
      spacing: space,
      borderRadius: radius,
      boxShadow: shadow,
      transitionDuration: {
        fast: "150ms",
        base: "220ms",
        slow: "300ms",
      },
    },
  },
};

export default preset;
