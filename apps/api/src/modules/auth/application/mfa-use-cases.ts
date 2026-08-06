import { randomBytes } from "node:crypto";
import type { AuditTrailPort } from "../../../shared/audit/audit-trail.js";
import type { TokenGeneratorPort } from "../../../shared/cryptography/token-generator.js";
import type { ClockPort } from "../../../shared/time/system-clock.js";
import {
  InvalidMfaCodeError,
  MfaAlreadyEnabledError,
  MfaNotEnrolledError,
} from "../domain/errors.js";
import {
  formatRecoveryCode,
  generateRecoveryCodes,
  normalizeRecoveryCode,
} from "../domain/recovery-codes.js";
import { fromBase32, otpauthUri, toBase32, verifyTotp } from "../domain/totp.js";
import type {
  MfaRepository,
  MfaState,
  PasswordHasher,
  UserAccountRepository,
} from "../domain/ports.js";

/**
 * Cas d'usage du second facteur (TOTP).
 *
 * L'enrolement est en deux temps volontairement : un secret est d'abord
 * genere et affiche, puis le facteur n'est active qu'une fois un code
 * verifie. Sans cette confirmation, un utilisateur qui scanne mal son QR code
 * se retrouverait verrouille dehors des la deconnexion suivante.
 */

interface MfaDependencies {
  readonly mfa: MfaRepository;
  readonly users: UserAccountRepository;
  readonly passwords: PasswordHasher;
  readonly tokens: TokenGeneratorPort;
  readonly clock: ClockPort;
  readonly audit: AuditTrailPort;
}

/** Nom affiche dans l'application d'authentification de l'utilisateur. */
const ISSUER = "SANARYS";

export class GetMfaStatusUseCase {
  constructor(private readonly mfa: MfaRepository) {}

  async execute(userId: string): Promise<{ enabled: boolean; remainingRecoveryCodes: number }> {
    const state = await this.mfa.findState(userId);
    return {
      enabled: state?.enabled ?? false,
      remainingRecoveryCodes: state?.remainingRecoveryCodes ?? 0,
    };
  }
}

export interface EnrollmentOffer {
  /** Secret base32, a saisir manuellement si le QR code ne peut pas etre scanne. */
  readonly secret: string;
  /** URI `otpauth://` a encoder en QR code. */
  readonly uri: string;
}

/**
 * Commence un enrolement : genere un secret et le retourne. Le facteur n'est
 * PAS actif a l'issue de cette etape.
 */
export class StartMfaEnrollmentUseCase {
  constructor(private readonly deps: Pick<MfaDependencies, "mfa" | "users">) {}

  async execute(userId: string): Promise<EnrollmentOffer> {
    const state = await this.deps.mfa.findState(userId);
    if (state?.enabled) throw new MfaAlreadyEnabledError();

    const profile = await this.deps.users.findProfile(userId);
    if (!profile) throw new MfaNotEnrolledError();

    // 20 octets : la taille recommandee par la RFC 4226 pour un secret HMAC-SHA1.
    const secret = toBase32(randomBytes(20));
    // Un nouvel enrolement ecrase le precedent : un secret affiche mais jamais
    // confirme ne doit pas rester utilisable indefiniment.
    await this.deps.mfa.storeSecret(userId, secret);

    return {
      secret,
      uri: otpauthUri({ secret, account: profile.email, issuer: ISSUER }),
    };
  }
}

/**
 * Termine l'enrolement : verifie un premier code, active le facteur et remet
 * les codes de secours. Ceux-ci ne sont retournes qu'ici, une seule fois.
 */
export class ConfirmMfaEnrollmentUseCase {
  constructor(private readonly deps: MfaDependencies) {}

  async execute(command: {
    userId: string;
    code: string;
    ip?: string | undefined;
  }): Promise<{ recoveryCodes: string[] }> {
    const state = await this.deps.mfa.findState(command.userId);
    if (state?.enabled) throw new MfaAlreadyEnabledError();
    if (!state?.secret) throw new MfaNotEnrolledError();

    const now = this.deps.clock.now();
    if (!verifyTotp(fromBase32(state.secret), command.code, now)) {
      throw new InvalidMfaCodeError();
    }

    const codes = generateRecoveryCodes(randomBytes);
    await this.deps.mfa.activate(
      command.userId,
      now,
      codes.map((code) => this.deps.tokens.hash(code)),
    );

    await this.deps.audit.record({
      actorUserId: command.userId,
      action: "auth.mfa_enabled",
      resourceType: "user",
      resourceId: command.userId,
      ip: command.ip,
    });

    return { recoveryCodes: codes.map(formatRecoveryCode) };
  }
}

/**
 * Desactive le second facteur. Le mot de passe est redemande : sans cela, une
 * session volee suffirait a retirer la protection que le facteur apporte.
 */
export class DisableMfaUseCase {
  constructor(private readonly deps: MfaDependencies) {}

  async execute(command: {
    userId: string;
    password: string;
    ip?: string | undefined;
  }): Promise<void> {
    const hash = await this.deps.users.findPasswordHash(command.userId);
    if (!hash || !(await this.deps.passwords.verify(hash, command.password))) {
      throw new InvalidMfaCodeError();
    }

    await this.deps.mfa.deactivate(command.userId);

    await this.deps.audit.record({
      actorUserId: command.userId,
      action: "auth.mfa_disabled",
      resourceType: "user",
      resourceId: command.userId,
      ip: command.ip,
    });
  }
}

/**
 * Verifie un code de second facteur, TOTP ou code de secours.
 *
 * Retourne simplement un booleen : c'est l'appelant (le cas d'usage de
 * connexion) qui decide ce qu'il en fait, parce que lui seul connait le defi
 * en cours et la session a ouvrir.
 */
export class VerifyMfaCodeUseCase {
  constructor(private readonly deps: Pick<MfaDependencies, "mfa" | "tokens" | "clock" | "audit">) {}

  async execute(command: { userId: string; code: string; ip?: string | undefined }): Promise<boolean> {
    const state = await this.deps.mfa.findState(command.userId);
    if (!state?.enabled || !state.secret) return false;

    const now = this.deps.clock.now();

    if (verifyTotp(fromBase32(state.secret), command.code, now)) return true;

    // A defaut, un code de secours. Il est consomme dans le meme mouvement :
    // la lecture et la consommation doivent etre atomiques, sinon deux
    // requetes simultanees pourraient reussir avec le meme code.
    const normalized = normalizeRecoveryCode(command.code);
    if (normalized.length === 0) return false;

    const consumed = await this.deps.mfa.consumeRecoveryCode(
      command.userId,
      this.deps.tokens.hash(normalized),
      now,
    );

    if (consumed) {
      // Un code de secours consomme merite une trace : c'est le signe soit
      // d'un telephone perdu, soit d'une liste qui a fuite.
      await this.deps.audit.record({
        actorUserId: command.userId,
        action: "auth.mfa_recovery_code_used",
        resourceType: "user",
        resourceId: command.userId,
        ip: command.ip,
      });
    }

    return consumed;
  }
}

export type { MfaState };
