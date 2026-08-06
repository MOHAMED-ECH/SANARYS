import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

// Charge la configuration locale (.env a la racine du monorepo).
// fileURLToPath et non .pathname : sous Windows, .pathname produit "/C:/..."
// que le systeme de fichiers refuse, et le .env n'etait alors jamais lu.
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

/**
 * Valeur de repli du secret de session. Elle est publique : elle est dans le
 * depot. C'est acceptable en developpement, jamais en production — d'ou le
 * controle explicite plus bas.
 */
const DEV_SESSION_SECRET = "dev-only-secret-change-me-please-32chars";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  SESSION_SECRET: z.string().min(16).default(DEV_SESSION_SECRET),
  // Origine du site Next.js. En local, les appels navigateur passent par le
  // proxy /api/v1 de Next : le CORS ne sert que si l'on vise l'API en direct.
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  STORAGE_DIR: z.string().default("./var/storage"),
  NOTIFICATIONS_ADAPTER: z.enum(["console"]).default("console"),
  CRM_ADAPTER: z.enum(["noop"]).default("noop"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

/**
 * Secrets qui figurent en clair dans le depot, et ne sont donc pas des secrets.
 *
 * Le piege n'est pas la valeur de repli du code : c'est celle de `.env.example`,
 * que `npm run setup` recopie telle quelle dans le `.env` local. C'est cette
 * valeur-la qui suit un projet jusqu'en production quand personne ne pense a
 * la remplacer, et elle passait tous les controles de longueur.
 */
const SECRETS_PUBLICS = new Set([
  DEV_SESSION_SECRET,
  "change-me-in-production-min-32-chars-long",
]);

/** Filet supplementaire pour les variantes qu'on n'a pas listees. */
const RESSEMBLE_A_UN_PLACEHOLDER = /change.?me|placeholder|exemple|example|dev-only|a-changer/i;

/**
 * Un demarrage en production avec un secret public est un echec, pas un
 * avertissement : c'est le genre d'oubli qui ne se voit que le jour de
 * l'incident.
 */
const CheckedEnvSchema = EnvSchema.superRefine((value, ctx) => {
  if (value.NODE_ENV !== "production") return;

  if (
    SECRETS_PUBLICS.has(value.SESSION_SECRET) ||
    RESSEMBLE_A_UN_PLACEHOLDER.test(value.SESSION_SECRET)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SESSION_SECRET"],
      message:
        "SESSION_SECRET est une valeur d'exemple, publiee dans le depot : elle ne protege rien. Generez-en un propre avec `openssl rand -base64 32` et definissez-le dans l'environnement de production.",
    });
  }
});

export const env = CheckedEnvSchema.parse(process.env);
