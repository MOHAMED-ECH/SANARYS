import path from "node:path";

/**
 * Emplacement des sessions enregistrees par le projet "setup".
 *
 * Ce module vit hors de `specs/` : Playwright interdit qu'un fichier de test
 * en importe un autre, et ces constantes sont partagees entre le setup et
 * les suites qui reutilisent les sessions.
 */
const AUTH_DIR = path.join(__dirname, "..", ".auth");

export const STORAGE = {
  /** Administrateur du groupement (ORG_ADMIN, appartenance directe). */
  client: path.join(AUTH_DIR, "client.json"),
  /** Direction d'une PME membre (COMPANY_DIRECTOR, ne peut pas inviter). */
  companyDirector: path.join(AUTH_DIR, "pme.json"),
  /** Personnel SANARYS (staffRole SALES). */
  staff: path.join(AUTH_DIR, "staff.json"),
} as const;

export const DEMO_PASSWORD = "sanarys-demo-2026";
