#!/usr/bin/env node
// Cree le .env local a partir de .env.example, sans jamais ecraser un fichier
// existant. Ecrit en Node plutot qu'en shell pour fonctionner a l'identique
// sous PowerShell, cmd, bash et zsh.

import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const target = `${root}.env`;
const source = `${root}.env.example`;

if (existsSync(target)) {
  console.log(".env existe deja : aucun changement.");
  process.exit(0);
}

if (!existsSync(source)) {
  console.error("Fichier .env.example introuvable. Depot incomplet ?");
  process.exit(1);
}

copyFileSync(source, target);
console.log(".env cree a partir de .env.example.");
console.log("Verifiez DATABASE_URL avant de lancer npm run db:migrate.");
