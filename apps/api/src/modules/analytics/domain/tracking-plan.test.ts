import { describe, expect, it } from "vitest";
import { sanitizeEventProperties } from "./tracking-plan.js";

describe("sanitizeEventProperties", () => {
  it("rejette un evenement hors plan de marquage", () => {
    expect(sanitizeEventProperties("evenement_invente", { a: 1 })).toBeNull();
  });

  it("ne conserve que les proprietes autorisees pour l'evenement", () => {
    const result = sanitizeEventProperties("request_audit", {
      type_organisation: "GROUPEMENT",
      zone: "bouskoura",
      email: "karim@example.ma",
      commentaire: "rappelez-moi lundi",
    });
    expect(result).toEqual({ type_organisation: "GROUPEMENT", zone: "bouskoura" });
  });

  it("ecarte une propriete autorisee pour un AUTRE evenement", () => {
    // "duree" appartient a complete_step, pas a view_result : la liste blanche
    // est par evenement, pas globale.
    expect(sanitizeEventProperties("view_result", { scenario: "A", duree: 42 })).toEqual({
      scenario: "A",
    });
  });

  it("accepte un evenement sans propriete", () => {
    expect(sanitizeEventProperties("portal_login", {})).toEqual({});
  });
});
