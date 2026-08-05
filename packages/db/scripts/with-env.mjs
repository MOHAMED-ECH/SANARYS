#!/usr/bin/env node
// Execute une commande avec le .env de la racine du monorepo charge dans
// l'environnement.
//
// Le CLI Prisma cherche un .env dans le dossier du schema et dans le dossier
// courant — ici packages/db — jamais a la racine du monorepo. Sans ce
// chargement, `prisma migrate dev` s'arrete sur "Environment variable not
// found: DATABASE_URL" alors que le fichier existe deux niveaux plus haut.
//
// Les variables deja presentes dans l'environnement ne sont jamais ecrasees :
// une configuration d'integration continue ou un DATABASE_URL exporte a la main
// reste prioritaire sur le fichier.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../../../.env", import.meta.url));

if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (key in process.env) continue;
    process.env[key] = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage : node scripts/with-env.mjs <commande> [arguments...]");
  process.exit(1);
}

// shell: true pour que Windows resolve les binaires .cmd de node_modules/.bin.
const child = spawn(command, args, { stdio: "inherit", shell: true });

child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});
