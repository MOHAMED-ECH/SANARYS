#!/usr/bin/env node
// Cree le .env local a partir de .env.example, sans jamais ecraser un fichier
// existant. Ecrit en Node plutot qu'en shell pour fonctionner a l'identique
// sous PowerShell, cmd, bash et zsh.
//
// Un .env deja present n'est jamais modifie : il contient des valeurs propres a
// la machine. Mais il peut avoir ete cree avant une evolution de .env.example et
// porter des cles obsoletes ou manquantes, sans que rien ne le signale. Ce
// script compare alors les deux fichiers et decrit l'ecart.

import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const target = `${root}.env`;
const source = `${root}.env.example`;

if (!existsSync(source)) {
  console.error("Fichier .env.example introuvable. Depot incomplet ?");
  process.exit(1);
}

/** Cles actives (non commentees) et cles proposees en commentaire. */
function readKeys(path) {
  const active = new Set();
  const commented = new Set();
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const match = /^#\s*([A-Z_][A-Z0-9_]*)\s*=/.exec(line);
      if (match?.[1]) commented.add(match[1]);
      continue;
    }
    const separator = line.indexOf("=");
    if (separator > 0) active.add(line.slice(0, separator).trim());
  }
  return { active, commented };
}

if (!existsSync(target)) {
  copyFileSync(source, target);
  console.log(".env cree a partir de .env.example.");
  console.log("Verifiez DATABASE_URL, puis lancez : npm run doctor");
  process.exit(0);
}

const example = readKeys(source);
const local = readKeys(target);

const missing = [...example.active].filter((key) => !local.active.has(key));
// Une cle active chez vous que .env.example ne propose plus qu'en commentaire
// est le cas typique du .env herite : la valeur reste en place et fait foi.
const obsolete = [...local.active].filter(
  (key) => !example.active.has(key) && !example.commented.has(key),
);
const nowOptional = [...local.active].filter((key) => example.commented.has(key));

console.log(".env existe deja : il n'est pas modifie.");

if (missing.length === 0 && obsolete.length === 0 && nowOptional.length === 0) {
  console.log("Il declare les memes cles que .env.example.");
} else {
  if (missing.length > 0) {
    console.log(`\nCles attendues et absentes : ${missing.join(", ")}`);
    console.log("  -> reprenez leurs lignes depuis .env.example.");
  }
  if (nowOptional.length > 0) {
    console.log(`\nCles devenues optionnelles : ${nowOptional.join(", ")}`);
    console.log("  -> .env.example ne les propose plus qu'en commentaire.");
    console.log("     Les garder actives est un choix : lisez le commentaire d'origine.");
  }
  if (obsolete.length > 0) {
    console.log(`\nCles inconnues de .env.example : ${obsolete.join(", ")}`);
    console.log("  -> sans effet, ou propres a votre environnement.");
  }
}

console.log("\nPour verifier que la configuration tient debout : npm run doctor");
