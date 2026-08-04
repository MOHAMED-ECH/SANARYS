import { expect, test, type Page } from "@playwright/test";

/**
 * Parcours d'acquisition complet : c'est le scenario qui valide la
 * conversion (critere PUB-AC-01 et SIM-AC-01 du cahier des charges).
 */

async function yesFor(page: Page, legend: string) {
  return page.locator(`fieldset:has-text("${legend}") label:has-text("Oui")`).first();
}

async function noFor(page: Page, legend: string) {
  return page.locator(`fieldset:has-text("${legend}") label:has-text("Non")`).first();
}

async function next(page: Page) {
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForTimeout(500);
}

test.describe("Simulateur CSPS", () => {
  test("un visiteur complète une simulation, obtient un résultat expliqué et demande un audit", async ({
    page,
  }) => {
    await page.goto("/simulateur");
    await expect(page.getByRole("heading", { name: /Votre zone industrielle/ })).toBeVisible();

    // Étape 1 — zone
    await page.selectOption("select", { index: 1 });
    await next(page);

    // Étape 2 — entreprises
    await expect(page.getByRole("heading", { name: /entreprises concernées/i })).toBeVisible();
    const numbers = page.locator('input[type="number"]');
    await numbers.nth(0).fill("6");
    await numbers.nth(1).fill("620");
    await page.getByText("50 à 150 salariés").click();
    await next(page);

    // Étape 3 — activité (risque élevé => ambulance type C attendue)
    await page.getByText("Automobile & câblage").click();
    await page.getByText("Presses, chimie, produits dangereux").click();
    await (await yesFor(page, "produits dangereux")).click();
    await next(page);

    // Étape 4 — horaires
    for (const day of ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]) {
      await page.locator(`label:has-text("${day}")`).first().click();
    }
    await (await yesFor(page, "travail de nuit")).click();
    await (await noFor(page, "activité le week-end")).click();
    await (await noFor(page, "pics saisonniers")).click();
    await next(page);

    // Étape 5 — dispositif existant
    await (await noFor(page, "ambulance est-elle déjà")).click();
    await (await noFor(page, "infirmerie existe-t-elle")).click();
    await page
      .locator('fieldset:has-text("Personnel médical déjà en place") label:has-text("Aucun")')
      .first()
      .click();
    await (await yesFor(page, "convention de médecine du travail")).click();
    await (await noFor(page, "contrats externes de secours")).click();
    await next(page);

    // Étape 6 — attentes
    await page
      .locator('fieldset:has-text("Niveau de reporting") label:has-text("Détaillé")')
      .first()
      .click();
    await (await noFor(page, "formations aux gestes")).click();
    await (await yesFor(page, "audit terrain gratuit")).click();
    await next(page);

    // Étape 7 — contact
    await page.getByLabel(/Nom et prénom/).fill("Karim Bennani");
    await page.getByRole("textbox", { name: "Entreprise" }).fill("Atlas Câblage E2E");
    await page.getByLabel(/Email professionnel/).fill(`e2e-${Date.now()}@example.ma`);
    await page.locator('input[type="checkbox"]').last().check();

    await page.getByRole("button", { name: /Obtenir ma configuration/ }).click();

    // Résultat : la recommandation est expliquée et tracée.
    await expect(page.getByRole("heading", { name: /règles suggèrent/ })).toBeVisible();
    await expect(page.getByText(/Ambulance type C/)).toBeVisible();
    await expect(page.getByText(/VEH-01/)).toBeVisible();
    await expect(page.getByText(/Hypothèses retenues/)).toBeVisible();

    // La mention non contractuelle doit être présente (exigence SIM-AC-01).
    await expect(page.getByRole("heading", { name: /Document non contractuel/ })).toBeVisible();

    // La traçabilité expose la version du moteur de règles.
    await page.getByRole("button", { name: /Voir la traçabilité du calcul/ }).click();
    await expect(page.getByText(/Moteur de règles version/)).toBeVisible();

    // Le récapitulatif PDF est réellement téléchargeable.
    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("link", { name: /Télécharger le récapitulatif PDF/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".pdf");

    // La demande d'audit aboutit et est confirmée à l'utilisateur.
    await page.getByRole("button", { name: /Demander un audit terrain gratuit/ }).click();
    await expect(page.getByText(/demande d'audit est enregistrée/i)).toBeVisible();
  });

  test("le simulateur ne présente jamais une réponse Oui/Non non enregistrée", async ({ page }) => {
    await page.goto("/simulateur");
    await page.selectOption("select", { index: 1 });
    await next(page);

    const numbers = page.locator('input[type="number"]');
    await numbers.nth(0).fill("3");
    await numbers.nth(1).fill("90");
    await page.getByText("20 à 50 salariés").click();
    await next(page);

    // Aucune option n'est cochée tant que l'utilisateur n'a pas répondu.
    const toggle = page.locator('fieldset:has-text("produits dangereux") input[type="radio"]');
    await expect(toggle.nth(0)).not.toBeChecked();
    await expect(toggle.nth(1)).not.toBeChecked();
  });
});
