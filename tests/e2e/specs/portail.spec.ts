import { expect, test } from "@playwright/test";
import { STORAGE } from "../support/storage";

/**
 * Isolation du portail vue depuis le navigateur (complète les tests HTTP
 * de l'API). Critère AUTH-AC-01 : aucun accès croisé entre organisations.
 *
 * Les sessions sont établies une seule fois par le projet "setup" et
 * réutilisées ici : voir playwright.config.ts.
 */

test.describe("Portail client — administrateur du groupement", () => {
  test.use({ storageState: STORAGE.client });

  test("accède à son organisation, ses contrats et ses rapports", async ({ page }) => {
    await page.goto("/portail");
    await expect(page.getByRole("heading", { name: /Groupement PME Zone Bouskoura/ })).toBeVisible();

    await page.goto("/portail/contrats");
    await expect(page.getByText(/Convention-cadre CSPS/)).toBeVisible();
    // La clé de répartition s'affiche en pourcentage, jamais en montant.
    await expect(page.getByText("%").first()).toBeVisible();

    await page.goto("/portail/rapports");
    await expect(page.getByText(/Juillet 2026/i)).toBeVisible();
  });

  test("ne peut pas atteindre la console commerciale", async ({ page }) => {
    await page.goto("/staff/leads");
    await expect(page.getByText(/Accès réservé/)).toBeVisible();
  });

  test("voit les membres et peut inviter", async ({ page }) => {
    await page.goto("/portail/membres");

    await expect(page.getByRole("button", { name: /Inviter un utilisateur/ })).toBeVisible();
    // Scopé à la liste : l'en-tête du portail affiche aussi le nom de l'utilisateur.
    await expect(page.locator("ul.divide-y").getByText(/Utilisateur Demo/)).toBeVisible();

    // Le formulaire annonce honnêtement que l'email n'est pas réellement envoyé.
    await page.getByRole("button", { name: /Inviter un utilisateur/ }).click();
    await expect(page.getByText(/n'est pas réellement envoyé/)).toBeVisible();
  });
});

test.describe("Portail client — direction d'une PME membre", () => {
  test.use({ storageState: STORAGE.companyDirector });

  test("ne peut pas inviter d'utilisateur", async ({ page }) => {
    await page.goto("/portail/membres");

    await expect(page.getByRole("button", { name: /Inviter un utilisateur/ })).toHaveCount(0);
    await expect(page.getByText(/Seul un administrateur rattaché/)).toBeVisible();
  });
});

test.describe("Console commerciale — personnel SANARYS", () => {
  test.use({ storageState: STORAGE.staff });

  test("accède à la file de leads mais pas au portail client", async ({ page }) => {
    await page.goto("/staff/leads");
    await expect(page.getByRole("heading", { name: /File de leads/ })).toBeVisible();

    await page.goto("/portail");
    await expect(page.getByText(/Espace indisponible/)).toBeVisible();
  });
});

test.describe("Visiteur non authentifié", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("est renvoyé vers la connexion depuis le portail", async ({ page }) => {
    await page.goto("/portail");
    await page.waitForURL(/\/connexion/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("ne peut pas atteindre la console commerciale", async ({ page }) => {
    await page.goto("/staff/leads");
    await page.waitForURL(/\/connexion/, { timeout: 30_000 });
  });

  test("reçoit un message qui ne révèle pas l'existence du compte", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel(/Email professionnel/).fill("compte-inexistant@example.ma");
    await page.getByLabel(/Mot de passe/).fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    // Cible le message du formulaire, pas l'annonceur de route de Next.js.
    await expect(page.locator("form p[role='alert']")).toContainText(/Identifiants invalides/);
  });
});
