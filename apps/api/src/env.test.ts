import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * La configuration est validee au demarrage, pas a la premiere requete : une
 * erreur de deploiement doit empecher le processus de vivre, pas produire une
 * faille silencieuse qui ne se verra qu'a l'incident.
 *
 * `env.ts` lit `process.env` au moment de l'import. Chaque cas reinitialise
 * donc le cache de modules avant de reimporter.
 */

const BASE = {
  DATABASE_URL: "postgresql://sanarys:sanarys@localhost:5432/sanarys_dev",
  SESSION_SECRET: undefined as string | undefined,
  NODE_ENV: "production",
};

async function chargerEnv(overrides: Partial<typeof BASE>) {
  vi.resetModules();
  const merged = { ...BASE, ...overrides };

  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  return import("./env.js");
}

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("configuration du secret de session", () => {
  it("refuse la valeur de repli du code", async () => {
    await expect(
      chargerEnv({ SESSION_SECRET: "dev-only-secret-change-me-please-32chars" }),
    ).rejects.toThrow(/SESSION_SECRET/);
  });

  // Le cas qui compte vraiment : c'est cette valeur-la que `npm run setup`
  // ecrit dans le .env, et donc celle qui suit un projet jusqu'en production.
  it("refuse l'espace reserve livre dans .env.example", async () => {
    await expect(
      chargerEnv({ SESSION_SECRET: "change-me-in-production-min-32-chars-long" }),
    ).rejects.toThrow(/SESSION_SECRET/);
  });

  it("refuse une variante non listee qui ressemble a un espace reserve", async () => {
    await expect(
      chargerEnv({ SESSION_SECRET: "SECRET-A-CHANGER-AVANT-LA-MISE-EN-PROD" }),
    ).rejects.toThrow(/SESSION_SECRET/);
  });

  it("accepte un secret propre en production", async () => {
    const { env } = await chargerEnv({ SESSION_SECRET: "un-secret-bien-a-nous-genere-au-hasard" });
    expect(env.SESSION_SECRET).toBe("un-secret-bien-a-nous-genere-au-hasard");
  });

  it("laisse le developpement demarrer avec l'espace reserve : le controle ne vise que la production", async () => {
    const { env } = await chargerEnv({
      NODE_ENV: "development",
      SESSION_SECRET: "change-me-in-production-min-32-chars-long",
    });
    expect(env.SESSION_SECRET).toBe("change-me-in-production-min-32-chars-long");
  });
});
