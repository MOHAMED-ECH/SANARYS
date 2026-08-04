import { createHash, randomBytes } from "node:crypto";

/**
 * Generation et hachage de jetons opaques.
 *
 * Regle : un jeton n'est JAMAIS persiste en clair. L'appelant recoit la
 * valeur une seule fois, la base ne stocke que son condensat.
 */
export interface TokenGeneratorPort {
  generate(): string;
  hash(token: string): string;
}

export class Sha256TokenGenerator implements TokenGeneratorPort {
  constructor(private readonly byteLength = 32) {}

  generate(): string {
    return randomBytes(this.byteLength).toString("base64url");
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
