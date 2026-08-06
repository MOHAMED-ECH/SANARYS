import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "@sanarys/db";
import { buildApp } from "../../app.js";
import { CSRF_COOKIE, SESSION_COOKIE } from "../auth/index.js";
import { Argon2PasswordHasher } from "../auth/infrastructure/argon2-password-hasher.js";

/**
 * Tests d'isolation de bout en bout (HTTP reel, base reelle).
 *
 * La fonction `can()` est testee unitairement ailleurs ; ici on verifie que
 * les ROUTES appliquent effectivement la decision et le scoping, y compris
 * lorsqu'un utilisateur manipule directement l'URL.
 *
 * Necessite une base de developpement accessible (DATABASE_URL).
 */

const PASSWORD = "isolation-test-2026";

let app: FastifyInstance;
const ids = {
  zone: "test-zone-isolation",
  groupement: "test-org-groupement",
  pmeA: "test-org-pme-a",
  pmeB: "test-org-pme-b",
  userA: "test-user-pme-a",
  userB: "test-user-pme-b",
  staff: "test-user-staff",
  contractB: "test-contract-b",
  reportB: "test-report-b",
};

async function login(email: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password: PASSWORD },
  });

  const cookies = response.cookies as { name: string; value: string }[];
  const session = cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? "";
  const csrf = cookies.find((c) => c.name === CSRF_COOKIE)?.value ?? "";

  return {
    status: response.statusCode,
    headers: {
      cookie: `${SESSION_COOKIE}=${session}; ${CSRF_COOKIE}=${csrf}`,
      "x-sanarys-csrf": csrf,
    },
  };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  // Le jeu de donnees de test est prepare en base directement : on utilise
  // donc le meme hacheur que l'application, sans passer par ses cas d'usage.
  const passwordHash = await new Argon2PasswordHasher().hash(PASSWORD);

  await prisma.industrialZone.upsert({
    where: { id: ids.zone },
    update: {},
    create: { id: ids.zone, name: "Zone de test", city: "Testville" },
  });

  await prisma.organization.upsert({
    where: { id: ids.groupement },
    update: {},
    create: { id: ids.groupement, name: "Groupement test", type: "GROUPEMENT" },
  });

  for (const [id, name] of [
    [ids.pmeA, "PME A test"],
    [ids.pmeB, "PME B test"],
  ] as const) {
    await prisma.organization.upsert({
      where: { id },
      update: {},
      create: { id, name, type: "COMPANY", parentId: ids.groupement },
    });
  }

  for (const [id, email, orgId] of [
    [ids.userA, "isolation-a@test.local", ids.pmeA],
    [ids.userB, "isolation-b@test.local", ids.pmeB],
  ] as const) {
    await prisma.user.upsert({
      where: { id },
      update: { passwordHash, status: "ACTIVE" },
      create: { id, email, fullName: "Test", passwordHash, status: "ACTIVE" },
    });
    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: id, organizationId: orgId } },
      update: {},
      create: { userId: id, organizationId: orgId, role: "COMPANY_DIRECTOR" },
    });
  }

  await prisma.user.upsert({
    where: { id: ids.staff },
    update: { passwordHash, status: "ACTIVE", staffRole: "SALES" },
    create: {
      id: ids.staff,
      email: "isolation-staff@test.local",
      fullName: "Staff test",
      passwordHash,
      status: "ACTIVE",
      staffRole: "SALES",
    },
  });

  // Donnees appartenant exclusivement a la PME B.
  await prisma.contract.upsert({
    where: { id: ids.contractB },
    update: {},
    create: {
      id: ids.contractB,
      organizationId: ids.pmeB,
      label: "Contrat confidentiel PME B",
      modules: ["AMBULANCE"],
      startDate: new Date("2026-01-01"),
    },
  });

  await prisma.report.upsert({
    where: { id: ids.reportB },
    update: {},
    create: {
      id: ids.reportB,
      organizationId: ids.pmeB,
      period: "2026-07",
      kpiJson: { interventionCount: 42 },
      publishedAt: new Date(),
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [ids.userA, ids.userB, ids.staff] } } });
  await prisma.session.deleteMany({ where: { userId: { in: [ids.userA, ids.userB, ids.staff] } } });
  await prisma.report.deleteMany({ where: { id: ids.reportB } });
  await prisma.contract.deleteMany({ where: { id: ids.contractB } });
  await prisma.organizationMembership.deleteMany({
    where: { userId: { in: [ids.userA, ids.userB] } },
  });
  await prisma.user.deleteMany({ where: { id: { in: [ids.userA, ids.userB, ids.staff] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [ids.pmeA, ids.pmeB] } } });
  await prisma.organization.deleteMany({ where: { id: ids.groupement } });
  await prisma.industrialZone.deleteMany({ where: { id: ids.zone } });
  await app.close();
  await prisma.$disconnect();
});

describe("isolation multi-organisations via HTTP", () => {
  it("refuse l'accès sans session", async () => {
    const response = await app.inject({ method: "GET", url: `/api/v1/organizations/${ids.pmeA}` });
    expect(response.statusCode).toBe(401);
  });

  it("un utilisateur accède à sa propre organisation", async () => {
    const { headers } = await login("isolation-a@test.local");
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/organizations/${ids.pmeA}`,
      headers,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe("PME A test");
  });

  it("un utilisateur de la PME A ne lit pas l'organisation de la PME B", async () => {
    const { headers } = await login("isolation-a@test.local");
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/organizations/${ids.pmeB}`,
      headers,
    });
    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain("PME B test");
  });

  it("un utilisateur de la PME A ne lit pas les contrats de la PME B", async () => {
    const { headers } = await login("isolation-a@test.local");
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/organizations/${ids.pmeB}/contracts`,
      headers,
    });
    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain("Contrat confidentiel");
  });

  it("un utilisateur de la PME A ne lit pas les rapports de la PME B", async () => {
    const { headers } = await login("isolation-a@test.local");
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/organizations/${ids.pmeB}/reports`,
      headers,
    });
    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain("42");
  });

  it("un utilisateur de la PME A ne peut pas inviter dans la PME B", async () => {
    const { headers } = await login("isolation-a@test.local");
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/organizations/${ids.pmeB}/users/invite`,
      headers,
      payload: { email: "intrus@test.local", fullName: "Intrus", role: "ORG_ADMIN" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("l'utilisateur de la PME B accède bien à ses propres données", async () => {
    const { headers } = await login("isolation-b@test.local");
    const contracts = await app.inject({
      method: "GET",
      url: `/api/v1/organizations/${ids.pmeB}/contracts`,
      headers,
    });
    expect(contracts.statusCode).toBe(200);
    expect(contracts.json()).toHaveLength(1);
  });
});

describe("cloisonnement du pipeline commercial", () => {
  it("un client ne peut pas lire la file de leads", async () => {
    const { headers } = await login("isolation-a@test.local");
    const response = await app.inject({ method: "GET", url: "/api/v1/staff/leads", headers });
    expect(response.statusCode).toBe(403);
  });

  it("le personnel SANARYS accède à la file de leads", async () => {
    const { headers } = await login("isolation-staff@test.local");
    const response = await app.inject({ method: "GET", url: "/api/v1/staff/leads", headers });
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.json().items)).toBe(true);
  });

  it("le personnel SANARYS n'accède pas aux espaces clients", async () => {
    const { headers } = await login("isolation-staff@test.local");
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/organizations/${ids.pmeA}`,
      headers,
    });
    expect(response.statusCode).toBe(404);
  });
});

describe("protection CSRF et session", () => {
  it("refuse une écriture sans en-tête anti-CSRF", async () => {
    const { headers } = await login("isolation-a@test.local");
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/organizations/${ids.pmeA}/users/invite`,
      headers: { cookie: headers.cookie },
      payload: { email: "x@test.local", fullName: "X", role: "VIEWER" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("révoque la session à la déconnexion", async () => {
    const { headers } = await login("isolation-b@test.local");
    const logout = await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers });
    expect(logout.statusCode).toBe(200);

    const after = await app.inject({
      method: "GET",
      url: `/api/v1/organizations/${ids.pmeB}`,
      headers,
    });
    expect(after.statusCode).toBe(401);
  });

  it("rejette des identifiants invalides sans révéler l'existence du compte", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "isolation-a@test.local", password: "mauvais-mot-de-passe" },
    });
    expect(response.statusCode).toBe(401);

    const unknown = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "inconnu@test.local", password: "mauvais-mot-de-passe" },
    });
    expect(unknown.statusCode).toBe(401);
    // Message identique : impossible de distinguer un compte existant d'un inconnu.
    expect(unknown.json().message).toBe(response.json().message);
  });

  it("verrouille le compte après plusieurs échecs consécutifs", async () => {
    const email = "isolation-b@test.local";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email, password: "mauvais-mot-de-passe" },
      });
    }

    // Même avec le bon mot de passe, le compte reste verrouillé un moment.
    const locked = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password: PASSWORD },
    });
    expect(locked.statusCode).toBe(429);
    expect(locked.json().code).toBe("ACCOUNT_LOCKED");

    await prisma.user.update({
      where: { id: ids.userB },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  });
});
