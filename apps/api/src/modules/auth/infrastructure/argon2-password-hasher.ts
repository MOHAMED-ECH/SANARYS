import argon2 from "argon2";
import type { PasswordHasher } from "../domain/ports.js";

/**
 * Hachage argon2id. Seul fichier du module a connaitre l'algorithme : en
 * changer, ou ajuster ses parametres de cout, ne touche aucun cas d'usage.
 */
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    // Une empreinte corrompue ou d'un autre format ne doit pas faire tomber la
    // requete en 500 : c'est un echec d'authentification, rien de plus.
    return argon2.verify(hash, password).catch(() => false);
  }

  async consumeTime(password: string): Promise<void> {
    await argon2.hash(password).catch(() => undefined);
  }
}
