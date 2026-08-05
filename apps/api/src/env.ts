import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

// Charge la configuration locale (.env a la racine du monorepo).
// fileURLToPath et non .pathname : sous Windows, .pathname produit "/C:/..."
// que le systeme de fichiers refuse, et le .env n'etait alors jamais lu.
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  SESSION_SECRET: z.string().min(16).default("dev-only-secret-change-me-please-32chars"),
  // Origine du site Next.js. En local, les appels navigateur passent par le
  // proxy /api/v1 de Next : le CORS ne sert que si l'on vise l'API en direct.
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  STORAGE_DIR: z.string().default("./var/storage"),
  NOTIFICATIONS_ADAPTER: z.enum(["console"]).default("console"),
  CRM_ADAPTER: z.enum(["noop"]).default("noop"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = EnvSchema.parse(process.env);
