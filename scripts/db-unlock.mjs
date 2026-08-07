#!/usr/bin/env node
// Leve le verrouillage des comptes apres trop de tentatives de connexion.
//
// Depuis que la reponse de /auth/login ne distingue plus un compte verrouille
// d'un mot de passe faux — c'est deliberé, cela permettait d'enumerer les
// comptes existants — un developpeur bloque en local n'a aucun moyen de le
// deviner depuis le formulaire. Cette commande existe pour ne pas avoir a
// attendre quinze minutes ni a ouvrir psql.
//
// Outil de developpement. Il agit sur la base pointee par DATABASE_URL et n'a
// rien a faire en production, ou lever un verrou est une operation qui se
// trace.

import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

/** Sans argument : tous les comptes verrouilles. Sinon, les emails donnes. */
const cibles = process.argv.slice(2);

try {
  const where =
    cibles.length > 0
      ? { email: { in: cibles } }
      : { OR: [{ lockedUntil: { not: null } }, { failedLoginCount: { gt: 0 } }] };

  const concernes = await prisma.user.findMany({
    where,
    select: { email: true, failedLoginCount: true, lockedUntil: true },
  });

  if (concernes.length === 0) {
    console.log("Aucun compte verrouille. Rien a faire.");
  } else {
    const { count } = await prisma.user.updateMany({
      where,
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    console.log(`${count} compte(s) deverrouille(s) :`);
    for (const compte of concernes) {
      const etat = compte.lockedUntil ? "verrouille" : `${compte.failedLoginCount} echec(s)`;
      console.log(`  - ${compte.email} (etait : ${etat})`);
    }
  }
} finally {
  await prisma.$disconnect();
}
