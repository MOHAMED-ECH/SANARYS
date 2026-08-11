import type { LoginResponse, MeResponse, MfaStatusResponse } from "@sanarys/schemas";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

/** Lit le jeton anti-CSRF depuis le cookie non httpOnly pose a la connexion. */
function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)sanarys_csrf=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...((init?.headers as Record<string, string>) ?? {}) };
  if (init?.body !== undefined) headers["content-type"] = "application/json";

  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    headers["x-sanarys-csrf"] = csrfToken();
  }

  const response = await fetch(`${BASE}${path}`, { ...init, headers, credentials: "include" });

  if (!response.ok) {
    let message = "Une erreur est survenue.";
    let code: string | undefined;
    try {
      const body = (await response.json()) as { message?: string; code?: string };
      if (body.message) message = body.message;
      code = body.code;
    } catch {
      // Corps non JSON : message generique.
    }
    throw new AuthError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface ContractDto {
  id: string;
  label: string;
  modules: string[];
  startDate: string;
  endDate: string | null;
  status: string;
  parties: { organizationId: string; organizationName: string; sharePercent: number | null }[];
}

export interface ReportDto {
  id: string;
  period: string;
  kpi: Record<string, number | string | boolean>;
  publishedAt: string | null;
}

export interface OrganizationDto {
  id: string;
  name: string;
  type: "GROUPEMENT" | "COMPANY" | "ZONE_MANAGER";
  industrialZoneName: string | null;
  memberCount: number;
  siteCount: number;
}

export interface MemberDto {
  userId: string;
  fullName: string;
  email: string;
  role: "ORG_ADMIN" | "HSE_MANAGER" | "COMPANY_DIRECTOR" | "ZONE_MANAGER" | "VIEWER";
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  mfaEnabled: boolean;
  invitedAt: string;
  activatedAt: string | null;
}

export interface DocumentDto {
  id: string;
  kind: "CONTRACT" | "REPORT" | "SIMULATION_SUMMARY" | "OTHER";
  label: string;
  mimeType: string;
  sizeBytes: number | null;
  createdAt: string;
}

export interface StaffLead {
  id: string;
  status: string;
  priority: string;
  score: number | null;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  preferredChannel: string | null;
  source: string | null;
  zoneName: string | null;
  ownerRef: string | null;
  nextActionAt: string | null;
  hasSimulation: boolean;
  auditRequestCount: number;
  crmSyncStatus: string;
  createdAt: string;
}

/** La reponse porte-t-elle une demande de second facteur plutot qu'un profil ? */
export function isMfaRequired(response: LoginResponse): response is { mfaRequired: true } {
  return "mfaRequired" in response && response.mfaRequired;
}

export const authApi = {
  /**
   * Un mot de passe correct n'ouvre pas forcement une session : quand le second
   * facteur est actif, la reponse demande une etape de plus. L'appelant est
   * oblige de distinguer les deux cas — voir `isMfaRequired`.
   */
  login: (email: string, password: string) =>
    authRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  verifyMfa: (code: string) =>
    authRequest<MeResponse>("/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  mfaStatus: () => authRequest<MfaStatusResponse>("/auth/mfa"),

  startMfaEnrollment: () =>
    authRequest<{ secret: string; uri: string }>("/auth/mfa/enroll", { method: "POST" }),

  confirmMfaEnrollment: (code: string) =>
    authRequest<{ recoveryCodes: string[] }>("/auth/mfa/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  disableMfa: (password: string) =>
    authRequest<{ ok: boolean }>("/auth/mfa/disable", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  logout: () => authRequest<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  me: () => authRequest<MeResponse>("/auth/me"),

  organization: (id: string) => authRequest<OrganizationDto>(`/organizations/${id}`),

  contracts: (id: string) => authRequest<ContractDto[]>(`/organizations/${id}/contracts`),

  reports: (id: string) => authRequest<ReportDto[]>(`/organizations/${id}/reports`),

  members: (id: string) => authRequest<MemberDto[]>(`/organizations/${id}/members`),

  documents: (id: string) => authRequest<DocumentDto[]>(`/organizations/${id}/documents`),

  /**
   * URL de telechargement d'un document.
   *
   * Une simple ancre plutot qu'un fetch : le navigateur gere alors lui-meme
   * l'enregistrement du fichier, la barre de progression et le nom propose par
   * l'API. Le cookie de session part avec la requete, comme pour n'importe
   * quelle navigation.
   */
  documentUrl: (documentId: string) => `${BASE}/documents/${documentId}/download`,

  inviteMember: (id: string, payload: { email: string; fullName: string; role: string }) =>
    authRequest<{ id: string }>(`/organizations/${id}/users/invite`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  staffLeads: (params: { status?: string; priority?: string } = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][],
    );
    return authRequest<{ items: StaffLead[]; total: number }>(
      `/staff/leads${query.toString() ? `?${query}` : ""}`,
    );
  },

  updateLead: (id: string, payload: Record<string, unknown>) =>
    authRequest<{ ok: boolean }>(`/staff/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
