#!/usr/bin/env node
// Diagnostic de l'environnement local. Repond a une seule question : qu'est-ce
// qui empeche `npm run dev:api` et `npm run dev:web` de fonctionner ici ?
//
// Chaque verification qui echoue affiche la commande exacte qui la corrige.
// Ecrit en Node sans dependance pour tourner a l'identique sous Windows,
// macOS et Linux.

import { existsSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const isWindows = process.platform === "win32";

const results = [];
let blocking = 0;

function record(level, label, detail, fix) {
  results.push({ level, label, detail, fix });
  if (level === "fail") blocking += 1;
}

const ok = (label, detail) => record("ok", label, detail);
const warn = (label, detail, fix) => record("warn", label, detail, fix);
const fail = (label, detail, fix) => record("fail", label, detail, fix);

/** Lit .env sans dependance externe : suffisant pour un diagnostic. */
function readEnvFile(path) {
  const values = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    values[key] = value;
  }
  return values;
}

/** Teste l'ouverture d'un socket TCP. Ni ping ni requete SQL : juste "ca repond". */
function probeTcp(host, port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const settle = (reachable) => {
      socket.destroy();
      resolve(reachable);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => settle(true));
    socket.once("timeout", () => settle(false));
    socket.once("error", () => settle(false));
  });
}

// --- 1. Node ---------------------------------------------------------------

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor >= 20) {
  ok("Node.js", `v${process.versions.node}`);
} else {
  fail(
    "Node.js",
    `v${process.versions.node} — la version 20 minimum est requise (22 recommandee, voir .nvmrc)`,
    "Installez Node 22 : https://nodejs.org — ou `nvm install 22 && nvm use 22`",
  );
}

// --- 2. Dependances installees --------------------------------------------

if (existsSync(`${root}node_modules`)) {
  ok("Dependances", "node_modules present");
} else {
  fail("Dependances", "node_modules absent", "npm install");
}

// --- 3. Client Prisma genere ----------------------------------------------

const prismaClientGenerated =
  existsSync(`${root}node_modules/.prisma/client/index.js`) ||
  existsSync(`${root}node_modules/.prisma/client/default.js`);

if (prismaClientGenerated) {
  ok("Client Prisma", "genere");
} else {
  fail(
    "Client Prisma",
    "non genere — l'API refusera de demarrer (`@prisma/client did not initialize yet`)",
    "npm run db:generate",
  );
}

// --- 4. Fichier .env -------------------------------------------------------

let envValues = {};
const envPath = `${root}.env`;

if (existsSync(envPath)) {
  envValues = readEnvFile(envPath);
  ok("Fichier .env", "present");
} else {
  fail("Fichier .env", "absent — l'API ne connait pas sa base de donnees", "npm run setup");
}

// --- 5. Base de donnees ----------------------------------------------------

const databaseUrl = envValues.DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  if (existsSync(envPath)) {
    fail("DATABASE_URL", "absente du .env", "Reprenez la ligne DATABASE_URL de .env.example");
  }
} else {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    fail("DATABASE_URL", "valeur illisible", "Format attendu : postgresql://user:mdp@hote:5432/base");
  }

  if (parsed) {
    const host = parsed.hostname;
    const port = Number(parsed.port || 5432);
    const reachable = await probeTcp(host, port);

    if (reachable) {
      ok("PostgreSQL", `joignable sur ${host}:${port}`);

      // Le port repond : on verifie maintenant le schema et les donnees.
      try {
        const { PrismaClient } = await import("@prisma/client");
        const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
        try {
          const zones = await prisma.industrialZone.count();
          if (zones > 0) {
            ok("Donnees", `${zones} zone(s) industrielle(s) — migrations et seed appliques`);
          } else {
            warn(
              "Donnees",
              "schema present mais aucune zone : le jeu de demonstration n'est pas charge",
              "npm run db:seed",
            );
          }
        } catch {
          fail(
            "Schema",
            "les tables n'existent pas encore dans cette base",
            "npm run db:migrate  puis  npm run db:seed",
          );
        } finally {
          await prisma.$disconnect();
        }
      } catch {
        // Client absent : deja signale par la verification 3.
      }
    } else {
      const hint = isWindows
        ? "Demarrez le service PostgreSQL (services.msc) ou `docker compose up -d postgres`"
        : "docker compose up -d postgres   (ou demarrez votre PostgreSQL local)";
      fail("PostgreSQL", `injoignable sur ${host}:${port}`, hint);
    }
  }
}

// --- 6. Coherence des URL front / API -------------------------------------

const publicApiBase = envValues.NEXT_PUBLIC_API_BASE_URL;
const corsOrigin = envValues.CORS_ORIGIN ?? "http://localhost:3000";

if (!publicApiBase) {
  ok("Appels navigateur", "meme origine via le proxy /api/v1 de Next — pas de CORS");
} else {
  let crossOrigin = false;
  try {
    crossOrigin = new URL(publicApiBase).origin !== "http://localhost:3000";
  } catch {
    fail("NEXT_PUBLIC_API_BASE_URL", "valeur illisible", "Commentez cette ligne dans .env");
  }
  const allowed = corsOrigin.split(",").map((o) => o.trim());
  if (crossOrigin && !allowed.includes("http://localhost:3000")) {
    fail(
      "CORS",
      `le navigateur appellera ${publicApiBase} depuis localhost:3000, refuse par CORS_ORIGIN=${corsOrigin}`,
      "Commentez NEXT_PUBLIC_API_BASE_URL dans .env, ou ajoutez http://localhost:3000 a CORS_ORIGIN",
    );
  } else {
    ok("CORS", `origine autorisee : ${corsOrigin}`);
  }
}

// --- 7. Ports --------------------------------------------------------------

const apiPort = Number(envValues.API_PORT ?? 4000);
for (const [port, service] of [
  [apiPort, "l'API"],
  [3000, "le site Next.js"],
]) {
  if (await probeTcp("127.0.0.1", port, 500)) {
    warn(
      `Port ${port}`,
      `deja occupe — soit ${service} tourne deja, soit un autre programme le retient`,
      `Si ce n'est pas ${service}, liberez le port ou changez API_PORT dans .env`,
    );
  } else {
    ok(`Port ${port}`, `libre pour ${service}`);
  }
}

// --- Rapport ---------------------------------------------------------------

const SYMBOL = { ok: "  OK  ", warn: " NOTE ", fail: "ECHEC " };

console.log("\nDiagnostic de l'environnement SANARYS 360\n");
for (const { level, label, detail, fix } of results) {
  console.log(`[${SYMBOL[level]}] ${label} : ${detail}`);
  if (fix) console.log(`           -> ${fix}`);
}

if (blocking === 0) {
  console.log("\nTout est en place. Dans deux terminaux :");
  console.log("  npm run dev:api     API sur http://localhost:4000 (documentation sur /docs)");
  console.log("  npm run dev:web     Site sur http://localhost:3000\n");
} else {
  const plural = blocking > 1 ? "s" : "";
  console.log(`\n${blocking} point${plural} bloquant${plural} a corriger, dans l'ordre affiche.`);
  console.log("Relancez `npm run doctor` apres correction.\n");
  process.exitCode = 1;
}
