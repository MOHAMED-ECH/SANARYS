/**
 * SANARYS 360 - design tokens
 *
 * Source unique de la palette, typographie, espacement et motion.
 * Direction artistique (cahier des charges SANARYS 360, section 13.1) :
 * bleu nuit (confiance/gouvernance), bleu petrole (sante operationnelle),
 * cuivre (energie/signature - ACCENT uniquement, jamais une couleur dominante),
 * sable (chaleur marocaine), blanc/brume (clarte).
 *
 * Regle non negociable : `copper` n'habille jamais un fond de section entier.
 * Il est reserve aux CTA ponctuels, icones, soulignes et petits accents.
 */

export const color = {
  navy: {
    950: "#0A1730",
    800: "#122448",
  },
  petrol: {
    600: "#0E6E7A",
    500: "#128796",
    100: "#E3F2F1",
  },
  copper: {
    // 5,01:1 sur blanc ET avec du texte blanc : utilisable pour du texte
    // et des boutons sans enfreindre WCAG AA (le #B5652C initial plafonnait
    // a 4,31:1 et echouait dans les deux sens).
    500: "#A85B26",
    300: "#D99A64",
  },
  sand: {
    200: "#EDE3D2",
    400: "#D9C8A6",
  },
  mist: {
    50: "#F7F8FA",
    white: "#FFFFFF",
  },
  slate: {
    // Texte secondaire accessible (4,55:1 minimum sur nos fonds clairs).
    // A utiliser au lieu d'une opacite reduite sur slate-600, qui faisait
    // tomber le contraste sous le seuil.
    400: "#6B7280",
    600: "#4A5568",
    900: "#1A202C",
  },
  // Couleurs d'etat. Elles servent aussi de couleur de TEXTE (messages
  // d'erreur, badges de priorite, mentions en attente), et doivent donc tenir
  // le seuil AA de 4,5:1 sur nos deux fonds clairs — pas seulement les 3:1
  // exiges d'un aplat graphique.
  //
  // Les valeurs initiales ne le tenaient pas : success plafonnait a 3,90:1 et
  // warning a 2,95:1 sur mist-50. Toutes deux ont ete assombries a teinte et
  // saturation constantes jusqu'au seuil. Meme correction que celle deja
  // appliquee au cuivre, pour la meme raison.
  status: {
    /** 4,59:1 sur mist-50, 4,87:1 sur blanc. */
    success: "#1B8152",
    /** 4,53:1 sur mist-50, 4,81:1 sur blanc. */
    warning: "#9E6616",
    /** 4,64:1 sur mist-50 : deja conforme, inchangee. */
    danger: "#C4453A",
  },
} as const;

export const font = {
  heading: "'Manrope Variable', 'Manrope', sans-serif",
  body: "'Manrope Variable', 'Manrope', sans-serif",
  arabic: "'IBM Plex Sans Arabic', 'Manrope', sans-serif",
} as const;

export const space = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  full: "999px",
} as const;

export const shadow = {
  card: "0 2px 12px -2px rgba(10, 23, 48, 0.08), 0 1px 2px rgba(10, 23, 48, 0.06)",
  elevated: "0 12px 32px -8px rgba(10, 23, 48, 0.18), 0 4px 8px rgba(10, 23, 48, 0.08)",
} as const;

export const motion = {
  fast: "150ms",
  base: "220ms",
  slow: "300ms",
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export const breakpoint = {
  sm: "480px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export const tokens = { color, font, space, radius, shadow, motion, breakpoint } as const;

export type Tokens = typeof tokens;
