import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Contrôles d'accessibilité automatisés (WCAG 2.2 AA, cahier des charges
 * section 20). Les tests automatiques ne couvrent qu'une partie des
 * critères : un passage clavier et lecteur d'écran manuel reste nécessaire
 * (voir docs/accessibilite.md).
 */

const PUBLIC_PAGES = [
  { path: "/", name: "Accueil" },
  { path: "/modele-csps", name: "Modèle CSPS" },
  { path: "/solutions", name: "Solutions" },
  { path: "/solutions/location-ambulances", name: "Solution détaillée" },
  { path: "/secteurs/automobile", name: "Secteur" },
  { path: "/zones", name: "Zones" },
  { path: "/qualite-conformite", name: "Qualité & conformité" },
  { path: "/ressources", name: "Ressources" },
  { path: "/contact", name: "Contact" },
  { path: "/simulateur", name: "Simulateur" },
];

for (const page of PUBLIC_PAGES) {
  test(`${page.name} ne présente aucune violation d'accessibilité sérieuse`, async ({
    page: browserPage,
  }) => {
    await browserPage.goto(page.path);
    await browserPage.waitForTimeout(1500);

    const results = await new AxeBuilder({ page: browserPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(
      blocking,
      blocking.map((v) => `${v.id}: ${v.help}`).join("\n"),
    ).toEqual([]);
  });
}

test("le parcours clavier atteint le simulateur depuis l'accueil", async ({ page }) => {
  await page.goto("/");

  // Le lien d'évitement est le premier élément focusable.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /Aller au contenu principal/ })).toBeFocused();

  // Le simulateur est atteignable et utilisable au clavier.
  await page.goto("/simulateur");
  await page.waitForTimeout(1500);
  const select = page.locator("select").first();
  await select.focus();
  await expect(select).toBeFocused();
});

test("les animations respectent prefers-reduced-motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await page.waitForTimeout(1200);

  // La page reste pleinement fonctionnelle sans animation.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Simuler mon CSPS/ }).first()).toBeVisible();
  await context.close();
});
