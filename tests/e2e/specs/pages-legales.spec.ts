import { expect, test } from "@playwright/test";

/**
 * Ces pages sont liées depuis le pied de page de tout le site : une
 * régression y produit un 404 sur chaque page du site, d'où le test dédié.
 */

test.describe("Pages légales et gestion des erreurs", () => {
  test("les liens du pied de page mènent à des pages existantes", async ({ page }) => {
    await page.goto("/");

    const legalLinks = ["Mentions légales", "Confidentialité"];
    for (const name of legalLinks) {
      const link = page.getByRole("link", { name });
      await expect(link).toBeVisible();

      const href = await link.getAttribute("href");
      const response = await page.request.get(href!);
      expect(response.status(), `${name} (${href})`).toBe(200);
    }
  });

  test("les mentions légales signalent explicitement ce qui reste à compléter", async ({ page }) => {
    await page.goto("/mentions-legales");
    await expect(page.getByRole("heading", { name: "Mentions légales", level: 1 })).toBeVisible();
    // La page ne doit pas prétendre être complète tant que SANARYS ne l'a pas renseignée.
    await expect(page.getByText(/Gabarit à compléter avant mise en ligne/)).toBeVisible();
  });

  test("la politique de confidentialité affirme l'absence de collecte de données de santé", async ({
    page,
  }) => {
    await page.goto("/confidentialite");
    await expect(
      page.getByRole("heading", { name: /Aucune donnée de santé n'est collectée/ }),
    ).toBeVisible();
    // Scopé au contenu : le pied de page mentionne aussi la loi 09-08.
    await expect(page.locator("main").getByText(/loi 09-08/).first()).toBeVisible();
    // Les formalités CNDP ne doivent pas être présentées comme accomplies.
    await expect(page.getByText(/Formalités déclaratives en cours/)).toBeVisible();
  });

  test("une adresse inconnue renvoie un 404 et propose des issues", async ({ page }) => {
    const response = await page.goto("/cette-page-nexiste-pas");
    expect(response?.status()).toBe(404);

    await expect(page.getByRole("heading", { name: /Cette page n'existe pas/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Retour à l'accueil/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Simuler mon dispositif/ })).toBeVisible();
  });
});
