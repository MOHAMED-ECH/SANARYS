import { describe, expect, it } from "vitest";
import { buildHistoryEntry, describeChanges } from "./lead-queue.js";

const current = { status: "NEW", priority: "MEDIUM" };

describe("describeChanges", () => {
  it("décrit une transition de statut", () => {
    expect(describeChanges(current, { status: "CONTACTED" })).toEqual([
      "statut : NEW → CONTACTED",
    ]);
  });

  it("ignore un champ soumis à l'identique", () => {
    // Renvoyer le formulaire sans rien changer ne doit pas polluer
    // l'historique : les vraies transitions doivent rester lisibles.
    expect(describeChanges(current, { status: "NEW", priority: "MEDIUM" })).toEqual([]);
  });

  it("distingue une désaffectation d'une absence de changement", () => {
    expect(describeChanges(current, { ownerRef: null })).toEqual(["affecté à : personne"]);
    expect(describeChanges(current, {})).toEqual([]);
  });

  it("cumule plusieurs changements", () => {
    expect(
      describeChanges(current, { status: "QUALIFIED", priority: "HIGH", ownerRef: "sofia" }),
    ).toHaveLength(3);
  });
});

describe("buildHistoryEntry", () => {
  it("une note prend le pas sur la description automatique", () => {
    const entry = buildHistoryEntry(current, { status: "CONTACTED", note: "Rappelé, sans réponse." });
    expect(entry).toEqual({ type: "NOTE", message: "Rappelé, sans réponse." });
  });

  it("résume les changements quand il n'y a pas de note", () => {
    const entry = buildHistoryEntry(current, { status: "CONTACTED", priority: "HIGH" });
    expect(entry.type).toBe("UPDATED");
    expect(entry.message).toBe("statut : NEW → CONTACTED · priorité : HIGH");
  });

  it("laisse une trace même quand rien ne change", () => {
    // Une requête sans effet reste un accès : elle doit apparaître.
    expect(buildHistoryEntry(current, {})).toEqual({ type: "UPDATED", message: "Mise à jour." });
  });
});
