import { config } from "dotenv";
import { z } from "zod";

// Charge la configuration locale (.env a la racine du monorepo).
config({ path: new URL("../../../.env", import.meta.url).pathname, quiet: true });

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  SESSION_SECRET: z.string().min(16).default("dev-only-secret-change-me-please-32chars"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  STORAGE_DIR: z.string().default("./var/storage"),
  NOTIFICATIONS_ADAPTER: z.enum(["console"]).default("console"),
  CRM_ADAPTER: z.enum(["noop"]).default("noop"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = EnvSchema.parse(process.env);
