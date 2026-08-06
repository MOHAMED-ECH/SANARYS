import type { AuthModule } from "../../auth/index.js";
import type { InviteIssuerPort } from "../domain/ports.js";

/**
 * Passerelle vers le module auth.
 *
 * Le portail n'ecrit jamais lui-meme un jeton d'invitation : il demande au
 * module auth de l'emettre. La politique de duree de vie et le hachage du
 * jeton restent donc au seul endroit qui en a la charge.
 */
export class AuthModuleInviteIssuer implements InviteIssuerPort {
  constructor(private readonly auth: AuthModule) {}

  async issue(userId: string): Promise<string> {
    return this.auth.createInvite.execute(userId);
  }
}
