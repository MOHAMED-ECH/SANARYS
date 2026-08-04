import { defineConfig, devices } from "@playwright/test";

/**
 * Les tests e2e s'executent contre les serveurs de developpement deja
 * demarres (API sur :4000, web sur :3000). Voir le README pour la
 * procedure complete.
 *
 * Le projet "setup" authentifie une fois par role et enregistre les sessions ;
 * les tests les reutilisent au lieu de se reconnecter. Cela evite de declencher
 * le limiteur de debit sur /auth/login, qui est un controle de securite reel
 * qu'on ne veut pas affaiblir pour les besoins des tests.
 */
export default defineConfig({
  testDir: "./specs",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? undefined,
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
});
