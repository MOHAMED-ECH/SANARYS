import { expect, test as setup, type Page } from "@playwright/test";
import { DEMO_PASSWORD, STORAGE } from "../support/storage";

/**
 * Authentifie une fois par rôle et enregistre l'état de session sur disque.
 *
 * Motivation : le limiteur de débit sur /auth/login est un contrôle de
 * sécurité réel (10 tentatives par 5 minutes). Se reconnecter à chaque test
 * le déclencherait légitimement. On se connecte donc une seule fois par rôle
 * et les tests réutilisent les cookies — ce qui les rend aussi plus rapides.
 */

async function authenticate(page: Page, email: string, file: string) {
  await page.goto("/connexion");
  await page.getByLabel(/Email professionnel/).fill(email);
  await page.getByLabel(/Mot de passe/).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(portail|staff)/, { timeout: 30_000 });
  await page.context().storageState({ path: file });
}

setup("authentifie l'administrateur du groupement", async ({ page }) => {
  await authenticate(page, "demo@sanarys.ma", STORAGE.client);
  await expect(page.getByRole("heading", { name: /Groupement PME Zone Bouskoura/ })).toBeVisible();
});

setup("authentifie la direction d'une PME membre", async ({ page }) => {
  await authenticate(page, "pme-a@sanarys.ma", STORAGE.companyDirector);
});

setup("authentifie le personnel SANARYS", async ({ page }) => {
  await authenticate(page, "staff@sanarys.ma", STORAGE.staff);
  await expect(page.getByRole("heading", { name: /File de leads/ })).toBeVisible();
});
