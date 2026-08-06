import { describe, expect, it } from "vitest";
import { prisma } from "@sanarys/db";
import { buildApp } from "../../app.js";

/**
 * Sonde temporaire : la reponse de /auth/login distingue-t-elle un compte
 * existant d'un compte inconnu ? Le limiteur de debit est inactif en test,
 * ce qui permet d'enchainer les tentatives.
 */
describe("sonde enumeration", () => {
  it("compare les reponses", async () => {
    const app = await buildApp();
    await app.ready();

    const attempt = (email: string) =>
      app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email, password: "mot-de-passe-totalement-faux" },
      });

    const inconnu: number[] = [];
    const connu: number[] = [];

    for (let i = 0; i < 7; i += 1) {
      inconnu.push((await attempt("personne-nexiste@nulle-part.test")).statusCode);
    }
    for (let i = 0; i < 7; i += 1) {
      const r = await attempt("demo@sanarys.ma");
      connu.push(r.statusCode);
    }

    console.log("compte INCONNU :", inconnu.join(" "));
    console.log("compte EXISTANT:", connu.join(" "));
    const dernier = await attempt("demo@sanarys.ma");
    console.log("corps final    :", dernier.body);

    // Remise en etat : on ne laisse pas le compte de demo verrouille.
    await prisma.user.update({
      where: { email: "demo@sanarys.ma" },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    await app.close();
    expect(true).toBe(true);
  });
});
