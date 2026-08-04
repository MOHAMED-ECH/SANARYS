import { expect, test, type Page } from "@playwright/test";

/**
 * Isolation du portail vue depuis le navigateur (complète les tests HTTP
 * de l'API). Critère AUTH-AC-01 : aucun accès croisé entre organisations.
 */

const DEMO_PASSWORD = "sanarys-demo-2026";

async function login(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel(/Email professionnel/).fill(email);
  await page.getByLabel(/Mot de passe/).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(portail|staff)/, { timeout: 30_000 });
}

test.describe("Portail client", () => {
  test("un client accède à son organisation, ses contrats et ses rapports", async ({ page }) => {
    await login(page, "demo@sanarys.ma");

    await expect(page.getByRole("heading", { name: /Groupement PME Zone Bouskoura/ })).toBeVisible();

    await page.goto("/portail/contrats");
    await expect(page.getByText(/Convention-cadre CSPS/)).toBeVisible();
    // La clé de répartition s'affiche en pourcentage, jamais en montant.
    await expect(page.getByText("%").first()).toBeVisible();

    await page.goto("/portail/rapports");
    await expect(page.getByText(/Juillet 2026/i)).toBeVisible();
  });

  test("un client ne peut pas atteindre la console commerciale", async ({ page }) => {
    await login(page, "demo@sanarys.ma");
    await page.goto("/staff/leads");
    await expect(page.getByText(/Accès réservé/)).toBeVisible();
  });

  test("le personnel SANARYS accède à la file de leads mais pas au portail client", async ({
    page,
  }) => {
    await login(page, "staff@sanarys.ma");
    await expect(page.getByRole("heading", { name: /File de leads/ })).toBeVisible();

    await page.goto("/portail");
    await expect(page.getByText(/Espace indisponible/)).toBeVisible();
  });

  test("un visiteur non authentifié est renvoyé vers la connexion", async ({ page }) => {
    await page.goto("/portail");
    await page.waitForURL(/\/connexion/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("des identifiants invalides ne révèlent pas l'existence du compte", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel(/Email professionnel/).fill("demo@sanarys.ma");
    await page.getByLabel(/Mot de passe/).fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    // Cible le message du formulaire, pas l'annonceur de route de Next.js.
    await expect(page.locator("form p[role='alert']")).toContainText(/Identifiants invalides/);
  });
});
