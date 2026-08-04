import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "./client.js";

/**
 * Regles v0 du moteur de recommandation du simulateur CSPS.
 *
 * Gouvernance : cette version est ACTIVE et donc immuable - toute evolution
 * passe par une nouvelle version (DRAFT -> approbation -> ACTIVE), jamais par
 * une modification en place. Chaque regle porte id / justification / date
 * d'effet / auteur / statut (cahier des charges, section 8.3), evaluee en
 * "premier match gagne" avec fallback "default" explicite. AUCUNE regle ne
 * produit un prix ferme ni une decision clinique - uniquement des suggestions
 * indicatives a confirmer par un audit terrain (gate de lancement, section 1.4).
 */
const SIMULATION_RULESET_V0 = {
  vehicleType: [
    {
      id: "VEH-01",
      status: "ACTIVE",
      effectiveAt: "2026-08-04",
      author: "SANARYS-produit",
      when: {
        any: [
          { field: "riskLevel", op: "eq", value: "HIGH" },
          { field: "totalHeadcount", op: "gte", value: 500 },
        ],
      },
      result: "TYPE_C",
      rationale:
        "Réanimation mobile recommandée au-delà de 500 salariés ou en cas de risque élevé — à confirmer par audit terrain.",
    },
    {
      id: "VEH-02",
      status: "ACTIVE",
      effectiveAt: "2026-08-04",
      author: "SANARYS-produit",
      when: "default",
      result: "TYPE_B",
      rationale: "Soins d'urgence standard, ajustable après audit terrain.",
    },
  ],
  modules: [
    {
      id: "MOD-NURSE-01",
      status: "ACTIVE",
      effectiveAt: "2026-08-04",
      author: "SANARYS-produit",
      when: {
        any: [
          { field: "totalHeadcount", op: "gte", value: 150 },
          { field: "nightWork", op: "eq", value: true },
        ],
      },
      result: "SUGGEST_NURSE",
      rationale: "Effectif ou horaires justifiant une présence infirmière quasi continue.",
    },
    {
      id: "MOD-DOCTOR-01",
      status: "ACTIVE",
      effectiveAt: "2026-08-04",
      author: "SANARYS-produit",
      when: {
        all: [
          { field: "riskLevel", op: "eq", value: "HIGH" },
          { field: "totalHeadcount", op: "gte", value: 300 },
        ],
      },
      result: "SUGGEST_DOCTOR",
      rationale:
        "Risque élevé et effectif important justifiant une présence médicale régulière — décision finale après audit et validation médicale.",
    },
    {
      id: "MOD-INFIRMERIE-01",
      status: "ACTIVE",
      effectiveAt: "2026-08-04",
      author: "SANARYS-produit",
      when: {
        all: [
          { field: "hasInfirmary", op: "eq", value: false },
          { field: "numberOfCompanies", op: "gte", value: 3 },
        ],
      },
      result: "SUGGEST_INFIRMARY",
      rationale:
        "Absence d'infirmerie existante et groupement suffisant pour mutualiser un local dédié.",
    },
  ],
  coverage: [
    {
      id: "COV-01",
      status: "ACTIVE",
      effectiveAt: "2026-08-04",
      author: "SANARYS-produit",
      when: "default",
      result: "TARGET_UNDER_10MIN",
      rationale:
        "Objectif contractuel cible : moins de 10 minutes depuis chaque PME membre (source brochure). Estimation théorique, non routée.",
      disclaimer:
        "Estimation illustrative, pas un calcul de routage réel. Le routage réel est établi lors de l'audit terrain.",
    },
  ],
  costShareFormula: [
    {
      id: "COST-01",
      status: "ACTIVE",
      effectiveAt: "2026-08-04",
      author: "SANARYS-produit",
      when: "default",
      formula: "hybrid_40_fixed_60_headcount",
      rationale:
        "Formule hybride par défaut : 40 % en part fixe égale entre PME + 60 % proportionnel à l'effectif. Configurable par le groupement. Fourchette indicative uniquement, jamais un prix ferme.",
    },
  ],
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

async function main() {
  console.log("Seed: zones industrielles...");
  const zones = await Promise.all(
    [
      { name: "Zone Industrielle Bouskoura", city: "Bouskoura", region: "Casablanca-Settat", lat: 33.4425, lng: -7.6497, isPilot: true },
      { name: "Zone Industrielle Ain Sebaa", city: "Casablanca", region: "Casablanca-Settat", lat: 33.6108, lng: -7.5326, isPilot: true },
      { name: "Atlantic Free Zone", city: "Kenitra", region: "Rabat-Sale-Kenitra", lat: 34.2529, lng: -6.5802, isPilot: false },
      { name: "Tanger Automotive City", city: "Tanger", region: "Tanger-Tetouan-Al Hoceima", lat: 35.6412, lng: -5.8654, isPilot: false },
      { name: "Zone Industrielle Berrechid", city: "Berrechid", region: "Casablanca-Settat", lat: 33.2651, lng: -7.5825, isPilot: false },
    ].map((z) =>
      prisma.industrialZone.upsert({
        where: { id: `seed-${z.city.toLowerCase().replace(/\s+/g, "-")}` },
        update: {},
        create: { id: `seed-${z.city.toLowerCase().replace(/\s+/g, "-")}`, ...z },
      }),
    ),
  );

  console.log("Seed: ruleset de simulation v0 (ACTIVE, immuable)...");
  const ruleSet = await prisma.simulationRuleSet.upsert({
    where: { version: "2026.08.0" },
    update: {},
    create: {
      version: "2026.08.0",
      effectiveAt: new Date("2026-08-04"),
      author: "SANARYS-produit",
      approvedBy: "SANARYS-direction (seed de developpement)",
      status: "ACTIVE",
      changelog: "Version initiale du moteur de recommandation indicatif du simulateur CSPS.",
      rulesJson: SIMULATION_RULESET_V0,
    },
  });

  console.log("Seed: organisations de demo (groupement + PME membres)...");
  const groupement = await prisma.organization.upsert({
    where: { id: "seed-org-groupement-bouskoura" },
    update: {},
    create: {
      id: "seed-org-groupement-bouskoura",
      name: "Groupement PME Zone Bouskoura",
      type: "GROUPEMENT",
      industrialZoneId: zones[0]!.id,
    },
  });

  const pmeA = await prisma.organization.upsert({
    where: { id: "seed-org-pme-atlas-cablage" },
    update: {},
    create: {
      id: "seed-org-pme-atlas-cablage",
      name: "Atlas Cablage SARL (demo)",
      type: "COMPANY",
      parentId: groupement.id,
      industrialZoneId: zones[0]!.id,
    },
  });

  const pmeB = await prisma.organization.upsert({
    where: { id: "seed-org-pme-maroc-plast" },
    update: {},
    create: {
      id: "seed-org-pme-maroc-plast",
      name: "Maroc Plast Industrie (demo)",
      type: "COMPANY",
      parentId: groupement.id,
      industrialZoneId: zones[0]!.id,
    },
  });

  console.log("Seed: utilisateurs de demo (via memberships) + staff SANARYS...");
  // Comptes de demonstration uniquement - jamais utilisables en production.
  const demoHash = await argon2.hash("sanarys-demo-2026");

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@sanarys.ma" },
    update: {},
    create: {
      id: "seed-user-demo",
      email: "demo@sanarys.ma",
      fullName: "Utilisateur Demo (Groupement)",
      status: "ACTIVE",
      activatedAt: new Date(),
      passwordHash: demoHash,
    },
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: demoUser.id, organizationId: groupement.id } },
    update: {},
    create: { userId: demoUser.id, organizationId: groupement.id, role: "ORG_ADMIN" },
  });

  const pmeUser = await prisma.user.upsert({
    where: { email: "pme-a@sanarys.ma" },
    update: {},
    create: {
      id: "seed-user-pme-a",
      email: "pme-a@sanarys.ma",
      fullName: "Directeur PME A (demo)",
      status: "ACTIVE",
      activatedAt: new Date(),
      passwordHash: demoHash,
    },
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: pmeUser.id, organizationId: pmeA.id } },
    update: {},
    create: { userId: pmeUser.id, organizationId: pmeA.id, role: "COMPANY_DIRECTOR" },
  });

  await prisma.user.upsert({
    where: { email: "staff@sanarys.ma" },
    update: {},
    create: {
      id: "seed-user-staff",
      email: "staff@sanarys.ma",
      fullName: "Commercial SANARYS (demo)",
      staffRole: "SALES",
      status: "ACTIVE",
      activatedAt: new Date(),
      passwordHash: demoHash,
    },
  });

  console.log("Seed: contrat-cadre + parties + rapport agrege de demo...");
  const contract = await prisma.contract.upsert({
    where: { id: "seed-contract-bouskoura" },
    update: {},
    create: {
      id: "seed-contract-bouskoura",
      organizationId: groupement.id,
      label: "Convention-cadre CSPS - Zone Bouskoura",
      modules: ["AMBULANCE", "INFIRMIER"],
      startDate: new Date("2026-01-01"),
      status: "ACTIVE",
    },
  });

  await prisma.contractParty.upsert({
    where: { contractId_organizationId: { contractId: contract.id, organizationId: pmeA.id } },
    update: {},
    create: { contractId: contract.id, organizationId: pmeA.id, shareRatio: 0.22 },
  });
  await prisma.contractParty.upsert({
    where: { contractId_organizationId: { contractId: contract.id, organizationId: pmeB.id } },
    update: {},
    create: { contractId: contract.id, organizationId: pmeB.id, shareRatio: 0.18 },
  });

  await prisma.report.upsert({
    where: { id: "seed-report-2026-07" },
    update: {},
    create: {
      id: "seed-report-2026-07",
      organizationId: groupement.id,
      period: "2026-07",
      kpiJson: {
        interventionCount: 12,
        availabilityRate: 0.998,
        avgResponseTimeMinutes: 8.4,
        trainingSessionsHeld: 2,
      },
      publishedAt: new Date("2026-08-01"),
    },
  });

  console.log("Seed: simulation de demo (token de reprise hashe)...");
  const demoResumeToken = randomBytes(32).toString("base64url");
  await prisma.simulation.upsert({
    where: { id: "seed-simulation-demo" },
    update: {},
    create: {
      id: "seed-simulation-demo",
      ruleSetId: ruleSet.id,
      industrialZoneId: zones[0]!.id,
      status: "IN_PROGRESS",
      inputJson: { zone: { city: "Bouskoura", zoneName: "Zone Industrielle Bouskoura" } },
      resumeTokenHash: sha256(demoResumeToken),
      resumeTokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });

  console.log(`Seed termine. Ruleset actif: ${ruleSet.version}. Zones: ${zones.length}.`);
  console.log("Comptes de demo (mot de passe: sanarys-demo-2026) :");
  console.log("  - demo@sanarys.ma  (ORG_ADMIN du groupement)");
  console.log("  - pme-a@sanarys.ma (COMPANY_DIRECTOR PME A)");
  console.log("  - staff@sanarys.ma (staff SANARYS, role SALES)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
