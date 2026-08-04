import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __sanarysPrisma: PrismaClient | undefined;
}

/**
 * Instance Prisma partagee. En dev, on la met en cache sur `global` pour
 * eviter d'ouvrir une nouvelle connexion a chaque rechargement a chaud.
 */
export const prisma = globalThis.__sanarysPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__sanarysPrisma = prisma;
}

export * from "@prisma/client";
