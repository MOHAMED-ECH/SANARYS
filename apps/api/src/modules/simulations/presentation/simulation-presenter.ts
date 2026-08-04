import type { SimulationRecord } from "@sanarys/schemas";
import type { Simulation, SimulationId } from "../domain/simulation.js";

/**
 * Presenter : traduit un agregat metier en reponse API.
 *
 * Le guide (section 4.2) interdit d'exposer directement un objet ORM. Il
 * interdit aussi, en pratique, de laisser fuiter la forme interne de
 * l'agregat : la reponse est un contrat, pas un miroir du domaine.
 */
export const simulationPresenter = {
  toRecord(simulation: Simulation): SimulationRecord {
    const snapshot = simulation.snapshot;
    return {
      id: snapshot.id,
      status: snapshot.status,
      input: snapshot.input,
      result: snapshot.result,
      createdAt: snapshot.createdAt.toISOString(),
      completedAt: snapshot.completedAt?.toISOString() ?? null,
    };
  },

  summaryUrl(id: SimulationId): string {
    return `/api/v1/simulations/${id}/pdf`;
  },
};
