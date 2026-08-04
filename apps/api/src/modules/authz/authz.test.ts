import { describe, expect, it } from "vitest";
import { accessibleOrganizationIds, can, type Actor } from "./index.js";

/**
 * Tests d'autorisation. L'exigence AUTH-AC-01 du cahier des charges impose
 * qu'un utilisateur d'une PME n'accede a AUCUNE donnee d'une autre PME,
 * y compris par URL, API, export ou cache.
 */

const ORG_GROUPEMENT = "org-groupement";
const ORG_PME_A = "org-pme-a";
const ORG_PME_B = "org-pme-b";

const pmeADirector: Actor = {
  userId: "user-pme-a",
  staffRole: null,
  memberships: [{ organizationId: ORG_PME_A, role: "COMPANY_DIRECTOR" }],
  scopeOrganizationIds: [ORG_PME_A],
};

const groupementAdmin: Actor = {
  userId: "user-groupement",
  staffRole: null,
  memberships: [{ organizationId: ORG_GROUPEMENT, role: "ORG_ADMIN" }],
  // Le groupement atteint ses PME membres.
  scopeOrganizationIds: [ORG_GROUPEMENT, ORG_PME_A, ORG_PME_B],
};

const hseViewer: Actor = {
  userId: "user-hse",
  staffRole: null,
  memberships: [{ organizationId: ORG_PME_A, role: "HSE_MANAGER" }],
  scopeOrganizationIds: [ORG_PME_A],
};

const salesStaff: Actor = {
  userId: "user-staff",
  staffRole: "SALES",
  memberships: [],
  scopeOrganizationIds: [],
};

const opsStaff: Actor = {
  userId: "user-ops",
  staffRole: "OPERATIONS",
  memberships: [],
  scopeOrganizationIds: [],
};

describe("isolation entre organisations", () => {
  it("une PME accède à ses propres données", () => {
    expect(can(pmeADirector, "organization:read", { organizationId: ORG_PME_A })).toBe(true);
    expect(can(pmeADirector, "contract:read", { organizationId: ORG_PME_A })).toBe(true);
    expect(can(pmeADirector, "report:read", { organizationId: ORG_PME_A })).toBe(true);
  });

  it("une PME n'accède JAMAIS aux données d'une autre PME", () => {
    for (const action of ["organization:read", "contract:read", "report:read", "member:invite"] as const) {
      expect(can(pmeADirector, action, { organizationId: ORG_PME_B })).toBe(false);
    }
  });

  it("une PME n'accède pas aux données du groupement dont elle n'est pas membre", () => {
    expect(can(pmeADirector, "report:read", { organizationId: ORG_GROUPEMENT })).toBe(false);
  });

  it("le périmètre de scoping d'une PME se limite à elle-même", () => {
    expect(accessibleOrganizationIds(pmeADirector)).toEqual([ORG_PME_A]);
    expect(accessibleOrganizationIds(pmeADirector)).not.toContain(ORG_PME_B);
  });

  it("refuse l'accès si aucune organisation n'est précisée", () => {
    expect(can(pmeADirector, "organization:read", {})).toBe(false);
    expect(can(pmeADirector, "report:read")).toBe(false);
  });
});

describe("administrateur de groupement", () => {
  it("accède à son groupement et à ses PME membres", () => {
    expect(can(groupementAdmin, "report:read", { organizationId: ORG_GROUPEMENT })).toBe(true);
    expect(can(groupementAdmin, "report:read", { organizationId: ORG_PME_A })).toBe(true);
    expect(can(groupementAdmin, "report:read", { organizationId: ORG_PME_B })).toBe(true);
  });

  it("n'accède pas à une organisation hors de son périmètre", () => {
    expect(can(groupementAdmin, "report:read", { organizationId: "org-inconnue" })).toBe(false);
  });

  it("ne peut inviter que dans une organisation dont il est membre DIRECT", () => {
    expect(can(groupementAdmin, "member:invite", { organizationId: ORG_GROUPEMENT })).toBe(true);
    // Acces herite sur la PME : lecture oui, invitation non.
    expect(can(groupementAdmin, "member:invite", { organizationId: ORG_PME_A })).toBe(false);
  });
});

describe("rôles en lecture seule", () => {
  it("un responsable HSE lit mais n'invite pas", () => {
    expect(can(hseViewer, "report:read", { organizationId: ORG_PME_A })).toBe(true);
    expect(can(hseViewer, "member:invite", { organizationId: ORG_PME_A })).toBe(false);
  });
});

describe("personnel SANARYS", () => {
  it("le commercial accède à la file de leads", () => {
    expect(can(salesStaff, "lead:read")).toBe(true);
    expect(can(salesStaff, "lead:write")).toBe(true);
  });

  it("le personnel opérations n'accède pas au pipeline commercial", () => {
    expect(can(opsStaff, "lead:read")).toBe(false);
  });

  it("le personnel SANARYS n'accède pas aux espaces clients par ce chemin", () => {
    expect(can(salesStaff, "organization:read", { organizationId: ORG_PME_A })).toBe(false);
    expect(can(salesStaff, "report:read", { organizationId: ORG_GROUPEMENT })).toBe(false);
    // Son périmètre client est vide : aucune requête ne peut remonter de données.
    expect(accessibleOrganizationIds(salesStaff)).toEqual([]);
  });
});

describe("cloisonnement du pipeline commercial", () => {
  it("aucun client ne lit les leads, quel que soit son rôle", () => {
    for (const actor of [pmeADirector, groupementAdmin, hseViewer]) {
      expect(can(actor, "lead:read")).toBe(false);
      expect(can(actor, "lead:write")).toBe(false);
    }
  });
});

describe("refus par défaut", () => {
  it("refuse toute action inconnue", () => {
    expect(can(groupementAdmin, "action:inexistante" as never, { organizationId: ORG_GROUPEMENT })).toBe(
      false,
    );
  });

  it("refuse un acteur sans appartenance ni rôle staff", () => {
    const orphan: Actor = {
      userId: "user-orphelin",
      staffRole: null,
      memberships: [],
      scopeOrganizationIds: [],
    };
    expect(can(orphan, "organization:read", { organizationId: ORG_PME_A })).toBe(false);
    expect(accessibleOrganizationIds(orphan)).toEqual([]);
  });
});
