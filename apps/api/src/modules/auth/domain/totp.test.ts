import { describe, expect, it } from "vitest";
import {
  TOTP_STEP_SECONDS,
  fromBase32,
  hotp,
  otpauthUri,
  toBase32,
  totp,
  verifyTotp,
} from "./totp.js";

/**
 * Conformite prouvee, pas supposee.
 *
 * Les RFC 4226 et 6238 publient des vecteurs de test officiels. Les rejouer
 * ici est la seule facon de savoir que notre implementation produira les
 * memes codes que Google Authenticator, Authy ou 1Password — un test maison
 * qui compare notre code a lui-meme ne prouverait rien.
 */

/** Secret des vecteurs de la RFC 4226 : la chaine ASCII "12345678901234567890". */
const RFC_SECRET = Buffer.from("12345678901234567890", "ascii");

describe("HOTP — vecteurs de test de la RFC 4226, annexe D", () => {
  const ATTENDUS = [
    "755224",
    "287082",
    "359152",
    "969429",
    "338314",
    "254676",
    "287922",
    "162583",
    "399871",
    "520489",
  ];

  it.each(ATTENDUS.map((code, counter) => ({ counter, code })))(
    "compteur $counter produit $code",
    ({ counter, code }) => {
      expect(hotp(RFC_SECRET, counter)).toBe(code);
    },
  );
});

describe("TOTP — vecteurs de test de la RFC 6238, annexe B", () => {
  // Les vecteurs de la RFC sont a huit chiffres ; les instants sont donnes en
  // secondes Unix.
  const VECTEURS = [
    { secondes: 59, code: "94287082" },
    { secondes: 1111111109, code: "07081804" },
    { secondes: 1111111111, code: "14050471" },
    { secondes: 1234567890, code: "89005924" },
    { secondes: 2000000000, code: "69279037" },
    { secondes: 20000000000, code: "65353130" },
  ];

  it.each(VECTEURS)("l'instant $secondes produit $code", ({ secondes, code }) => {
    expect(totp(RFC_SECRET, new Date(secondes * 1000), { digits: 8 })).toBe(code);
  });
});

describe("encodage base32", () => {
  it("fait l'aller-retour sans perte", () => {
    const secret = Buffer.from("un secret de test quelconque", "utf8");
    expect(fromBase32(toBase32(secret)).equals(secret)).toBe(true);
  });

  it("produit l'encodage attendu par les applications d'authentification", () => {
    // Vecteur de la RFC 4648, section 10.
    expect(toBase32(Buffer.from("foobar", "ascii"))).toBe("MZXW6YTBOI");
  });

  it("tolere les espaces et le remplissage d'une saisie manuelle", () => {
    expect(fromBase32("MZXW 6YTB OI==").toString("ascii")).toBe("foobar");
  });

  it("refuse un caractere hors alphabet", () => {
    expect(() => fromBase32("MZXW6YTB01")).toThrow(/invalide/i);
  });
});

describe("verification d'un code saisi", () => {
  const MAINTENANT = new Date("2026-08-06T12:00:00Z");

  it("accepte le code du pas courant", () => {
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, MAINTENANT), MAINTENANT)).toBe(true);
  });

  it("tolere une horloge en retard d'un pas", () => {
    const enRetard = new Date(MAINTENANT.getTime() - TOTP_STEP_SECONDS * 1000);
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, enRetard), MAINTENANT)).toBe(true);
  });

  it("tolere une horloge en avance d'un pas", () => {
    const enAvance = new Date(MAINTENANT.getTime() + TOTP_STEP_SECONDS * 1000);
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, enAvance), MAINTENANT)).toBe(true);
  });

  it("refuse au-dela de la fenetre de tolerance", () => {
    const troploin = new Date(MAINTENANT.getTime() + 3 * TOTP_STEP_SECONDS * 1000);
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, troploin), MAINTENANT)).toBe(false);
  });

  it("refuse un code d'un autre secret", () => {
    const autre = Buffer.from("un-tout-autre-secret", "ascii");
    expect(verifyTotp(RFC_SECRET, totp(autre, MAINTENANT), MAINTENANT)).toBe(false);
  });

  it("refuse ce qui n'est pas six chiffres", () => {
    for (const saisie of ["", "12345", "1234567", "abcdef", "12 34 5", "000000a"]) {
      expect(verifyTotp(RFC_SECRET, saisie, MAINTENANT)).toBe(false);
    }
  });

  it("accepte une saisie espacee, comme la recopie depuis un telephone", () => {
    const code = totp(RFC_SECRET, MAINTENANT);
    const espace = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(verifyTotp(RFC_SECRET, espace, MAINTENANT)).toBe(true);
  });
});

describe("URI d'enrolement", () => {
  it("porte tous les parametres attendus par une application d'authentification", () => {
    const uri = otpauthUri({
      secret: "JBSWY3DPEHPK3PXP",
      account: "demo@sanarys.ma",
      issuer: "SANARYS",
    });

    expect(uri).toContain("otpauth://totp/SANARYS%3Ademo%40sanarys.ma");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=SANARYS");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});
