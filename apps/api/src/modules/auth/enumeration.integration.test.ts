import { describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "@sanarys/db";
import { buildApp } from "../../app.js";
import { MAX_FAILED_LOGINS } from "./domain/credentials.js";
import { Argon2PasswordHasher } from "./infrastructure/argon2-password-hasher.js";

/**
 * Non-enumeration des comptes, verifiee sur la reponse HTTP reelle.
 *
 * Le test unitaire de `credentials.ts` couvre la politique de verrouillage.
 * Celui-ci couvre autre chose : ce que la reponse LAISSE DEVINER. Les deux
 * sont necessaires — une politique correcte peut parfaitement etre trahie par
 * un code de statut trop bavard.
 *
 * Le scenario est celui d'un attaquant qui teste une liste d'adresses avec un
 * mot de passe quelconque et compare les reponses.
 *
 * Necessite une base de developpement accessible (DATABASE_URL).
 */

const PASSWORD = "enumeration-test-2026";
const EXISTANT = "enumeration-existant@test.local";
const INCONNU = "enumeration-personne@test.local";
const USER_ID = "test-user-enumeration";

let app: FastifyInstance;

const tenter = (email: string, password: string) =>
  app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { email, password } });

const empreinte = (r: Awaited<ReturnType<typeof tenter>>) => `${r.statusCode} ${r.body}`;

describe("non-enumeration des comptes sur /auth/login", () => {
  it("ne distingue pas un compte existant d'un compte inconnu, meme apres verrouillage", async () => {
    app = await buildApp();
    await app.ready();

    await prisma.user.upsert({
      where: { id: USER_ID },
      update: { passwordHash: await new Argon2PasswordHasher().hash(PASSWORD), status: "ACTIVE" },
      create: {
        id: USER_ID,
        email: EXISTANT,
        fullName: "Compte de test",
        passwordHash: await new Argon2PasswordHasher().hash(PASSWORD),
        status: "ACTIVE",
      },
    });

    // Assez de tentatives pour franchir largement le seuil de verrouillage.
    const tentatives = MAX_FAILED_LOGINS + 3;
    const reponsesInconnu: string[] = [];
    const reponsesExistant: string[] = [];

    for (let i = 0; i < tentatives; i += 1) {
      reponsesInconnu.push(empreinte(await tenter(INCONNU, "mot-de-passe-faux")));
      reponsesExistant.push(empreinte(await tenter(EXISTANT, "mot-de-passe-faux")));
    }

    // Le coeur du test : aucune reponse ne doit permettre de trancher.
    expect(new Set(reponsesExistant).size).toBe(1);
    expect(reponsesExistant[0]).toBe(reponsesInconnu[0]);
    expect(reponsesExistant[0]).toContain("INVALID_CREDENTIALS");
    expect(reponsesExistant.join()).not.toContain("ACCOUNT_LOCKED");

    // Le verrouillage doit malgre tout etre bien actif : la discretion ne doit
    // pas avoir ete obtenue en desactivant la protection.
    const verrouille = await prisma.user.findUnique({
      where: { id: USER_ID },
      select: { failedLoginCount: true, lockedUntil: true },
    });
    expect(verrouille?.failedLoginCount).toBeGreaterThanOrEqual(MAX_FAILED_LOGINS);
    expect(verrouille?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());

    // Et celui qui connait le mot de passe, lui, apprend que le compte est
    // verrouille : c'est une information qu'il peut recevoir sans risque.
    const avecBonMotDePasse = await tenter(EXISTANT, PASSWORD);
    expect(avecBonMotDePasse.statusCode).toBe(429);
    expect(avecBonMotDePasse.body).toContain("ACCOUNT_LOCKED");

    await prisma.auditLog.deleteMany({ where: { actorUserId: USER_ID } });
    await prisma.session.deleteMany({ where: { userId: USER_ID } });
    await prisma.user.deleteMany({ where: { id: USER_ID } });
    await app.close();
  });
});
