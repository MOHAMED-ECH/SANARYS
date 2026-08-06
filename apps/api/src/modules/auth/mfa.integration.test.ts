import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "@sanarys/db";
import { buildApp } from "../../app.js";
import { CSRF_COOKIE, SESSION_COOKIE } from "./index.js";
import { MFA_CHALLENGE_COOKIE } from "./presentation/cookies.js";
import { Argon2PasswordHasher } from "./infrastructure/argon2-password-hasher.js";
import { fromBase32, totp } from "./domain/totp.js";
import { normalizeRecoveryCode } from "./domain/recovery-codes.js";

/**
 * Parcours complet du second facteur, sur HTTP reel et base reelle.
 *
 * Ce qui est verifie ici ne l'est nulle part ailleurs : que le mot de passe
 * seul n'ouvre plus de session des lors que le facteur est actif. C'est la
 * propriete qui justifie toute la fonctionnalite — un test unitaire du TOTP ne
 * la couvre pas.
 */

const PASSWORD = "mfa-integration-2026";
const EMAIL = "mfa-integration@test.local";
const USER_ID = "test-user-mfa";

let app: FastifyInstance;

interface Cookies {
  readonly header: string;
  readonly csrf: string;
  readonly names: string[];
}

function readCookies(response: { cookies: unknown }): Cookies {
  const jar = response.cookies as { name: string; value: string }[];
  const csrf = jar.find((c) => c.name === CSRF_COOKIE)?.value ?? "";
  return {
    header: jar.map((c) => `${c.name}=${c.value}`).join("; "),
    csrf,
    names: jar.filter((c) => c.value !== "").map((c) => c.name),
  };
}

const connecter = () =>
  app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: EMAIL, password: PASSWORD },
  });

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  const passwordHash = await new Argon2PasswordHasher().hash(PASSWORD);
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: { passwordHash, status: "ACTIVE", mfaEnabled: false, mfaSecret: null },
    create: {
      id: USER_ID,
      email: EMAIL,
      fullName: "Compte MFA",
      passwordHash,
      status: "ACTIVE",
    },
  });
});

afterAll(async () => {
  await prisma.mfaChallenge.deleteMany({ where: { userId: USER_ID } });
  await prisma.mfaRecoveryCode.deleteMany({ where: { userId: USER_ID } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: USER_ID } });
  await prisma.session.deleteMany({ where: { userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await app.close();
  await prisma.$disconnect();
});

describe("second facteur — enrôlement puis connexion", () => {
  let secret = "";
  let recoveryCodes: string[] = [];

  it("sans second facteur, le mot de passe ouvre directement une session", async () => {
    const response = await connecter();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ email: EMAIL });
    expect(readCookies(response).names).toContain(SESSION_COOKIE);
  });

  it("l'enrôlement produit un secret sans encore activer le facteur", async () => {
    const session = readCookies(await connecter());

    const enroll = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/enroll",
      headers: { cookie: session.header, "x-sanarys-csrf": session.csrf },
    });

    expect(enroll.statusCode).toBe(200);
    secret = enroll.json().secret;
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(enroll.json().uri).toContain("otpauth://totp/SANARYS");

    // Tant que rien n'est confirme, le facteur reste inactif : un QR code mal
    // scanne ne doit pas enfermer l'utilisateur dehors.
    const state = await prisma.user.findUnique({
      where: { id: USER_ID },
      select: { mfaEnabled: true },
    });
    expect(state?.mfaEnabled).toBe(false);
  });

  it("refuse d'activer sur un code faux", async () => {
    const session = readCookies(await connecter());

    const confirm = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/confirm",
      headers: { cookie: session.header, "x-sanarys-csrf": session.csrf },
      payload: { code: "000000" },
    });

    expect(confirm.statusCode).toBe(401);
    expect(confirm.body).toContain("INVALID_MFA_CODE");
  });

  it("active le facteur sur un code correct et remet les codes de secours", async () => {
    const session = readCookies(await connecter());

    const confirm = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/confirm",
      headers: { cookie: session.header, "x-sanarys-csrf": session.csrf },
      payload: { code: totp(fromBase32(secret), new Date()) },
    });

    expect(confirm.statusCode).toBe(200);
    recoveryCodes = confirm.json().recoveryCodes;
    expect(recoveryCodes).toHaveLength(10);
  });

  it("le mot de passe seul n'ouvre plus de session", async () => {
    const response = await connecter();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ mfaRequired: true });

    const cookies = readCookies(response);
    expect(cookies.names).toContain(MFA_CHALLENGE_COOKIE);
    // La propriete essentielle : rien qui ressemble a une session ouverte.
    expect(cookies.names).not.toContain(SESSION_COOKIE);
  });

  it("un code faux ne consomme pas le défi : la saisie peut être corrigée", async () => {
    const challenge = readCookies(await connecter());

    const faux = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/verify",
      headers: { cookie: challenge.header },
      payload: { code: "000000" },
    });
    expect(faux.statusCode).toBe(401);

    const bon = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/verify",
      headers: { cookie: challenge.header },
      payload: { code: totp(fromBase32(secret), new Date()) },
    });
    expect(bon.statusCode).toBe(200);
    expect(readCookies(bon).names).toContain(SESSION_COOKIE);
  });

  it("un défi déjà consommé ne peut pas être rejoué", async () => {
    const challenge = readCookies(await connecter());

    const premier = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/verify",
      headers: { cookie: challenge.header },
      payload: { code: totp(fromBase32(secret), new Date()) },
    });
    expect(premier.statusCode).toBe(200);

    const rejeu = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/verify",
      headers: { cookie: challenge.header },
      payload: { code: totp(fromBase32(secret), new Date()) },
    });
    expect(rejeu.statusCode).toBe(401);
    expect(rejeu.body).toContain("INVALID_MFA_CHALLENGE");
  });

  it("un code de secours ouvre une session, et ne resservira pas", async () => {
    const premier = readCookies(await connecter());
    const code = recoveryCodes[0]!;

    const ouverture = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/verify",
      headers: { cookie: premier.header },
      payload: { code },
    });
    expect(ouverture.statusCode).toBe(200);

    // Le meme code, sur un nouveau defi : refuse.
    const second = readCookies(await connecter());
    const rejeu = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/verify",
      headers: { cookie: second.header },
      payload: { code },
    });
    expect(rejeu.statusCode).toBe(401);

    const restants = await prisma.mfaRecoveryCode.count({
      where: { userId: USER_ID, usedAt: null },
    });
    expect(restants).toBe(9);
  });

  it("accepte un code de secours quelle que soit sa ponctuation", async () => {
    const challenge = readCookies(await connecter());
    const brut = normalizeRecoveryCode(recoveryCodes[1]!);
    const espace = `${brut.slice(0, 5)} ${brut.slice(5)}`.toLowerCase();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/verify",
      headers: { cookie: challenge.header },
      payload: { code: espace },
    });
    expect(response.statusCode).toBe(200);
  });

  it("refuse la désactivation sans le mot de passe", async () => {
    const challenge = readCookies(await connecter());
    const ouverture = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/verify",
      headers: { cookie: challenge.header },
      payload: { code: totp(fromBase32(secret), new Date()) },
    });
    const session = readCookies(ouverture);

    const refus = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/disable",
      headers: { cookie: session.header, "x-sanarys-csrf": session.csrf },
      payload: { password: "ce-nest-pas-le-bon-mot-de-passe" },
    });
    expect(refus.statusCode).toBe(401);

    const encoreActif = await prisma.user.findUnique({
      where: { id: USER_ID },
      select: { mfaEnabled: true },
    });
    expect(encoreActif?.mfaEnabled).toBe(true);
  });

  it("désactive avec le mot de passe, et efface secret et codes de secours", async () => {
    const challenge = readCookies(await connecter());
    const ouverture = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/verify",
      headers: { cookie: challenge.header },
      payload: { code: totp(fromBase32(secret), new Date()) },
    });
    const session = readCookies(ouverture);

    const desactivation = await app.inject({
      method: "POST",
      url: "/api/v1/auth/mfa/disable",
      headers: { cookie: session.header, "x-sanarys-csrf": session.csrf },
      payload: { password: PASSWORD },
    });
    expect(desactivation.statusCode).toBe(200);

    const apres = await prisma.user.findUnique({
      where: { id: USER_ID },
      select: { mfaEnabled: true, mfaSecret: true },
    });
    expect(apres?.mfaEnabled).toBe(false);
    expect(apres?.mfaSecret).toBeNull();
    expect(await prisma.mfaRecoveryCode.count({ where: { userId: USER_ID } })).toBe(0);

    // Et la connexion redevient directe.
    expect((await connecter()).json()).toMatchObject({ email: EMAIL });
  });
});
