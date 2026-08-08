#!/usr/bin/env node
// Teste la connexion contre l'API locale et interprete le resultat.
//
// Existe parce que la meme verification en ligne de commande est un piege : les
// echappements JSON de `curl` different entre PowerShell, cmd et bash, et un
// corps mal echappe produit un 400 qui n'apprend rien sur l'authentification.
// Ici, Node construit le corps lui-meme : le resultat est identique partout.
//
// Usage :
//   npm run check:login                          -- compte de demonstration
//   npm run check:login -- email@x.ma motdepasse -- un compte precis

import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const [email = "demo@sanarys.ma", password = "sanarys-demo-2026"] = process.argv.slice(2);
const port = process.env.API_PORT ?? "4000";
const url = `http://localhost:${port}/api/v1/auth/login`;

/** Ce que chaque statut signifie concretement, et quoi faire ensuite. */
function interpreter(status, corps) {
  if (status === 200 && corps?.mfaRequired) {
    return ["OK", "mot de passe accepte — un code de second facteur est demande"];
  }
  if (status === 200) {
    return ["OK", `connecte en tant que ${corps?.email ?? "?"}`];
  }
  if (status === 401) {
    return [
      "ECHEC",
      "identifiants refuses. Soit le compte n'existe pas (npm run db:seed),\n" +
        "         soit le mot de passe est faux, soit le compte est VERROUILLE —\n" +
        "         la reponse ne les distingue pas volontairement. `npm run doctor` tranche.",
    ];
  }
  if (status === 429) {
    return ["ECHEC", `trop de tentatives : ${corps?.message ?? "limite atteinte"}`];
  }
  if (status === 500) {
    const detail = String(corps?.message ?? "");
    if (detail.includes("P2022") || /column|colonne/i.test(detail)) {
      return ["ECHEC", "le schema de la base est en retard sur le code -> npm run db:migrate"];
    }
    return ["ECHEC", `erreur interne de l'API : ${detail.slice(0, 200)}`];
  }
  return ["ECHEC", `statut inattendu — ${JSON.stringify(corps).slice(0, 200)}`];
}

console.log(`\nTest de connexion sur ${url}`);
console.log(`Compte : ${email}\n`);

let response;
try {
  response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
} catch (error) {
  console.log("[ECHEC ] API injoignable : " + error.message);
  console.log("         -> Demarrez-la dans un autre terminal : npm run dev:api\n");
  process.exit(1);
}

let corps = null;
try {
  corps = await response.json();
} catch {
  // Reponse non JSON : le statut suffira.
}

const [niveau, explication] = interpreter(response.status, corps);
console.log(`[${niveau.padEnd(6)}] HTTP ${response.status} — ${explication}\n`);
process.exit(niveau === "OK" ? 0 : 1);
