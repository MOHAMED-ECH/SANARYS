import type {
  CreateAuditRequest,
  CreateLeadRequest,
  IndustrialZoneDto,
  SimulationRecord,
  SimulationResult,
} from "@sanarys/schemas";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Ne declarer un content-type JSON que s'il y a effectivement un corps :
  // Fastify rejette une requete annoncant du JSON avec un corps vide.
  const headers: Record<string, string> = { ...((init?.headers as Record<string, string>) ?? {}) };
  if (init?.body !== undefined && headers["content-type"] === undefined) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let message = "Une erreur est survenue. Merci de reessayer.";
    let code: string | undefined;
    try {
      const body = (await response.json()) as { message?: string; code?: string };
      if (body.message) message = body.message;
      code = body.code;
    } catch {
      // Corps non JSON : on garde le message generique.
    }
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  zones: () => request<IndustrialZoneDto[]>("/zones"),

  startSimulation: (industrialZoneId?: string) =>
    request<{ id: string; resumeToken: string }>("/simulations", {
      method: "POST",
      body: JSON.stringify(industrialZoneId ? { industrialZoneId } : {}),
    }),

  saveStep: (id: string, step: string, data: Record<string, unknown>) =>
    request<{ ok: boolean }>(`/simulations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ step, data }),
    }),

  resumeSimulation: (id: string, resumeToken: string) =>
    request<SimulationRecord>(`/simulations/${id}?resumeToken=${encodeURIComponent(resumeToken)}`),

  completeSimulation: (id: string) =>
    request<{ id: string; result: SimulationResult; pdfUrl: string }>(
      `/simulations/${id}/complete`,
      { method: "POST" },
    ),

  pdfUrl: (id: string) => `${BASE}/simulations/${id}/pdf`,

  createLead: (payload: CreateLeadRequest) =>
    request<{ id: string; status: string; createdAt: string }>("/leads", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createAuditRequest: (payload: CreateAuditRequest) =>
    request<{ id: string; status: string; createdAt: string }>("/audit-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /** Plan de marquage : jamais de texte libre ni de donnee identifiante. */
  track: (name: string, properties: Record<string, string | number | boolean> = {}) =>
    request<{ accepted: boolean }>("/events", {
      method: "POST",
      body: JSON.stringify({ name, properties }),
    }).catch(() => ({ accepted: false })),
};
