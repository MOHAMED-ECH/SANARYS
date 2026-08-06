import { describe, expect, it, vi } from "vitest";
import { LeadNotFoundError } from "../../leads/domain/errors.js";
import type { AuditRequestRepository, LeadsGateway } from "../domain/ports.js";
import { RequestAuditUseCase } from "./use-cases.js";

/**
 * Ces tests tournent sans base ni serveur HTTP : c'est precisement ce que la
 * refonte en couches rend possible. Les ports sont remplaces par des doubles.
 */

function build(overrides: { leads?: Partial<LeadsGateway> } = {}) {
  const created: Array<{ leadId: string; preferredDate: Date | null; notes: string | null }> = [];

  const auditRequests: AuditRequestRepository = {
    create: async (data) => {
      created.push(data);
      return { id: "audit-1", status: "PENDING", createdAt: new Date("2026-08-06T09:00:00Z") };
    },
  };

  const markAuditRequested = vi.fn(async (command: { leadId: string; message: string }) => ({
    id: command.leadId,
    companyName: "Atlas Cablage",
  }));
  const leads: LeadsGateway = { markAuditRequested, ...overrides.leads };
  const send = vi.fn(async () => {});

  return {
    created,
    markAuditRequested,
    send,
    useCase: new RequestAuditUseCase({ auditRequests, leads, notifications: { send } }),
  };
}

describe("RequestAuditUseCase", () => {
  it("fait progresser le lead, cree la demande et notifie le commercial", async () => {
    const { useCase, created, markAuditRequested, send } = build();

    const result = await useCase.execute({ leadId: "lead-1", preferredDate: "2026-09-15" });

    expect(result.id).toBe("audit-1");
    expect(created).toHaveLength(1);
    expect(created[0]?.leadId).toBe("lead-1");
    expect(markAuditRequested).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledOnce();
  });

  it("inscrit la date souhaitee dans l'historique du lead", async () => {
    const { useCase, markAuditRequested } = build();

    await useCase.execute({ leadId: "lead-1", preferredDate: "2026-09-15" });

    expect(markAuditRequested.mock.calls[0]?.[0]?.message).toContain("15/09/2026");
  });

  it("ne cree aucune demande si le lead n'existe pas", async () => {
    const { useCase, created, send } = build({
      leads: {
        markAuditRequested: async () => {
          throw new LeadNotFoundError("inconnu");
        },
      },
    });

    // Une demande d'audit orpheline serait invisible dans la file commerciale :
    // l'echec doit se produire avant toute ecriture.
    await expect(useCase.execute({ leadId: "inconnu" })).rejects.toBeInstanceOf(LeadNotFoundError);
    expect(created).toHaveLength(0);
    expect(send).not.toHaveBeenCalled();
  });
});
