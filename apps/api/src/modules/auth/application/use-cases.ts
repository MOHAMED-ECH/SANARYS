import type { NotificationPort } from "../../../integrations/notifications/index.js";
import type { AuditTrailPort } from "../../../shared/audit/audit-trail.js";
import type { TokenGeneratorPort } from "../../../shared/cryptography/token-generator.js";
import type { ClockPort } from "../../../shared/time/system-clock.js";
import {
  CLEARED_LOCKOUT,
  INVITE_TTL_MS,
  RESET_TTL_MS,
  SESSION_TTL_MS,
  afterFailedAttempt,
  isLocked,
  isTokenUsable,
  needsLockoutReset,
} from "../domain/credentials.js";
import {
  AccountLockedError,
  AccountUnavailableError,
  InvalidCredentialsError,
  InvalidInviteError,
  InvalidMfaChallengeError,
  InvalidMfaCodeError,
  InvalidResetTokenError,
} from "../domain/errors.js";
import type {
  MfaChallengeRepository,
  PasswordHasher,
  SessionRepository,
  UserAccountRepository,
  UserProfile,
} from "../domain/ports.js";

/**
 * Cas d'usage de l'authentification (guide, section 4.6).
 *
 * Aucun code HTTP ici, aucun cookie, aucun acces ORM : la gestion des cookies
 * et des statuts appartient a la couche presentation, celle des tables aux
 * depots.
 */

interface CoreDependencies {
  readonly users: UserAccountRepository;
  readonly sessions: SessionRepository;
  readonly passwords: PasswordHasher;
  readonly tokens: TokenGeneratorPort;
  readonly clock: ClockPort;
  readonly audit: AuditTrailPort;
}

/**
 * Issue d'une tentative de connexion.
 *
 * Deux formes, parce qu'un mot de passe correct n'ouvre plus forcement une
 * session : quand le second facteur est actif, il ouvre un defi. La couche
 * presentation doit traiter les deux cas, et le type l'y oblige.
 */
export type LogInResult =
  | {
      readonly kind: "session";
      /** Jeton de session en clair : retourne une seule fois, seul le hash est persiste. */
      readonly sessionToken: string;
      readonly profile: UserProfile;
    }
  | {
      readonly kind: "mfa_required";
      /** Jeton de defi, court et a usage unique. */
      readonly challengeToken: string;
    };

/** Duree de vie du defi de second facteur. */
export const MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export class LogInUseCase {
  constructor(
    private readonly deps: CoreDependencies & {
      readonly challenges: MfaChallengeRepository;
    },
  ) {}

  async execute(command: {
    email: string;
    password: string;
    ip?: string | undefined;
    userAgent?: string | undefined;
  }): Promise<LogInResult> {
    const now = this.deps.clock.now();
    const user = await this.deps.users.findAuthenticatableByEmail(command.email);

    if (!user || !user.passwordHash || user.status !== "ACTIVE") {
      // Cout constant : on hashe quand meme pour ne pas reveler, par le temps
      // de reponse, qu'aucun compte ne porte cet email.
      await this.deps.passwords.consumeTime(command.password);
      await this.recordFailure(command.ip, "invalid");
      throw new InvalidCredentialsError();
    }

    const locked = isLocked(user.lockout, now);
    const valid = await this.deps.passwords.verify(user.passwordHash, command.password);

    if (!valid) {
      // Un echec compte meme pendant le verrouillage : c'est ce qui prolonge
      // l'attente d'un attaquant qui insiste, comme le promet `afterFailedAttempt`.
      await this.deps.users.updateLockout(user.id, afterFailedAttempt(user.lockout, now));
      await this.recordFailure(command.ip, locked ? "locked" : "invalid", user.id);
      // Reponse volontairement identique a celle d'un compte inconnu. Reveler
      // ici que le compte est verrouille suffirait a enumerer les comptes :
      // il suffirait d'envoyer cinq mots de passe faux par adresse candidate
      // et de guetter le statut qui change.
      throw new InvalidCredentialsError();
    }

    // A partir d'ici, l'appelant a prouve qu'il connait le mot de passe. Lui
    // dire que le compte est verrouille ne lui apprend rien qu'il ignore.
    if (locked) {
      await this.recordFailure(command.ip, "locked", user.id);
      throw new AccountLockedError();
    }

    if (needsLockoutReset(user.lockout)) {
      await this.deps.users.updateLockout(user.id, CLEARED_LOCKOUT);
    }

    // Second facteur actif : le mot de passe ne suffit pas. Aucune session
    // n'est ouverte a ce stade — seulement un defi court, qui ne donne acces
    // a rien d'autre qu'a la verification du code.
    if (user.mfaEnabled) {
      const challengeToken = this.deps.tokens.generate();

      // Un nouveau defi annule les precedents : deux fenetres de connexion
      // ouvertes en parallele ne doivent pas laisser deux defis valides.
      await this.deps.challenges.deleteAllForUser(user.id);
      await this.deps.challenges.create({
        userId: user.id,
        tokenHash: this.deps.tokens.hash(challengeToken),
        ip: command.ip ?? null,
        expiresAt: new Date(now.getTime() + MFA_CHALLENGE_TTL_MS),
      });

      await this.deps.audit.record({
        actorUserId: user.id,
        action: "auth.mfa_challenge_issued",
        resourceType: "session",
        ip: command.ip,
      });

      return { kind: "mfa_required", challengeToken };
    }

    // Rotation : toute nouvelle connexion revoque les sessions precedentes.
    await this.deps.sessions.revokeAllForUser(user.id, now);

    const sessionToken = this.deps.tokens.generate();
    await this.deps.sessions.create({
      userId: user.id,
      tokenHash: this.deps.tokens.hash(sessionToken),
      ip: command.ip ?? null,
      userAgent: command.userAgent ?? null,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    });

    await this.deps.audit.record({
      actorUserId: user.id,
      action: "auth.login_success",
      resourceType: "session",
      ip: command.ip,
    });

    const profile = await this.deps.users.findProfile(user.id);
    if (!profile) throw new AccountUnavailableError();

    return { kind: "session", sessionToken, profile };
  }

  /**
   * Un echec est journalise sans identifiant d'acteur quand le compte est
   * inconnu : le journal ne doit pas devenir lui-meme une liste d'emails
   * valides testes par un attaquant.
   */
  private async recordFailure(
    ip: string | undefined,
    reason: "invalid" | "locked",
    actorUserId?: string,
  ): Promise<void> {
    await this.deps.audit.record({
      ...(actorUserId ? { actorUserId } : {}),
      action: "auth.login_failure",
      resourceType: "session",
      ip,
      metadata: { reason },
    });
  }
}

/**
 * Seconde etape de la connexion : un defi valide plus un code correct ouvrent
 * la session que le mot de passe seul n'a pas ouverte.
 *
 * La verification du code est deleguee — ce cas d'usage ne connait ni TOTP ni
 * codes de secours, seulement la regle « defi consomme, session ouverte ».
 */
export class CompleteMfaLogInUseCase {
  constructor(
    private readonly deps: Pick<
      CoreDependencies,
      "users" | "sessions" | "tokens" | "clock" | "audit"
    > & {
      readonly challenges: MfaChallengeRepository;
      readonly verifyCode: (command: {
        userId: string;
        code: string;
        ip?: string | undefined;
      }) => Promise<boolean>;
    },
  ) {}

  async execute(command: {
    challengeToken: string;
    code: string;
    ip?: string | undefined;
    userAgent?: string | undefined;
  }): Promise<LogInResult & { kind: "session" }> {
    const now = this.deps.clock.now();
    const challenge = await this.deps.challenges.findPendingByTokenHash(
      this.deps.tokens.hash(command.challengeToken),
      now,
    );

    if (!challenge) throw new InvalidMfaChallengeError();

    const ok = await this.deps.verifyCode({
      userId: challenge.userId,
      code: command.code,
      ip: command.ip,
    });

    if (!ok) {
      // Le defi n'est pas consomme : une faute de frappe ne doit pas obliger a
      // ressaisir le mot de passe. Sa duree de vie courte borne les tentatives,
      // et le limiteur de debit de la route borne leur cadence.
      await this.deps.audit.record({
        actorUserId: challenge.userId,
        action: "auth.mfa_failure",
        resourceType: "session",
        ip: command.ip,
      });
      throw new InvalidMfaCodeError();
    }

    await this.deps.challenges.consume(challenge.id, now);
    await this.deps.sessions.revokeAllForUser(challenge.userId, now);

    const sessionToken = this.deps.tokens.generate();
    await this.deps.sessions.create({
      userId: challenge.userId,
      tokenHash: this.deps.tokens.hash(sessionToken),
      ip: command.ip ?? null,
      userAgent: command.userAgent ?? null,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    });

    await this.deps.audit.record({
      actorUserId: challenge.userId,
      action: "auth.login_success",
      resourceType: "session",
      ip: command.ip,
      metadata: { secondFactor: true },
    });

    const profile = await this.deps.users.findProfile(challenge.userId);
    if (!profile) throw new AccountUnavailableError();

    return { kind: "session", sessionToken, profile };
  }
}

export class ResolveSessionUseCase {
  constructor(private readonly deps: Pick<CoreDependencies, "sessions" | "tokens" | "clock">) {}

  async execute(sessionToken: string): Promise<{ sessionId: string; userId: string } | null> {
    const session = await this.deps.sessions.findActiveByTokenHash(
      this.deps.tokens.hash(sessionToken),
      this.deps.clock.now(),
    );
    return session ? { sessionId: session.id, userId: session.userId } : null;
  }
}

export class LogOutUseCase {
  constructor(private readonly deps: Pick<CoreDependencies, "sessions" | "clock" | "audit">) {}

  async execute(command: { sessionId: string; userId: string; ip?: string | undefined }): Promise<void> {
    await this.deps.sessions.revoke(command.sessionId, this.deps.clock.now());
    await this.deps.audit.record({
      actorUserId: command.userId,
      action: "auth.logout",
      resourceType: "session",
      ip: command.ip,
    });
  }
}

export class GetCurrentUserUseCase {
  constructor(private readonly users: UserAccountRepository) {}

  async execute(userId: string): Promise<UserProfile> {
    const profile = await this.users.findProfile(userId);
    if (!profile) throw new AccountUnavailableError();
    return profile;
  }
}

/**
 * Cree une invitation et retourne le jeton en clair UNE SEULE FOIS.
 * Seule son empreinte est persistee : une fuite de la base ne permet pas de
 * rejouer une invitation.
 */
export class CreateInviteUseCase {
  constructor(private readonly deps: Pick<CoreDependencies, "users" | "tokens" | "clock">) {}

  async execute(userId: string): Promise<string> {
    const token = this.deps.tokens.generate();
    await this.deps.users.storeInviteToken(
      userId,
      this.deps.tokens.hash(token),
      new Date(this.deps.clock.now().getTime() + INVITE_TTL_MS),
    );
    return token;
  }
}

export class AcceptInviteUseCase {
  constructor(private readonly deps: CoreDependencies) {}

  async execute(command: {
    token: string;
    password: string;
    ip?: string | undefined;
  }): Promise<void> {
    const now = this.deps.clock.now();
    const target = await this.deps.users.findByInviteTokenHash(this.deps.tokens.hash(command.token));

    if (!target || !isTokenUsable(target.expiresAt, now)) {
      throw new InvalidInviteError();
    }

    await this.deps.users.activateWithPassword(
      target.id,
      await this.deps.passwords.hash(command.password),
      now,
    );

    await this.deps.audit.record({
      actorUserId: target.id,
      action: "auth.invite_accepted",
      resourceType: "user",
      resourceId: target.id,
      ip: command.ip,
    });
  }
}

/**
 * Prepare une reinitialisation. N'echoue jamais quand le compte n'existe pas :
 * la reponse ne doit pas reveler qui est inscrit.
 */
export class RequestPasswordResetUseCase {
  constructor(
    private readonly deps: Pick<CoreDependencies, "users" | "tokens" | "clock"> & {
      readonly notifications: NotificationPort;
    },
  ) {}

  async execute(email: string): Promise<void> {
    const userId = await this.deps.users.findIdByEmail(email);
    if (!userId) return;

    const token = this.deps.tokens.generate();
    await this.deps.users.storeResetToken(
      userId,
      this.deps.tokens.hash(token),
      new Date(this.deps.clock.now().getTime() + RESET_TTL_MS),
    );

    // Adaptateur mocke : le lien est journalise, jamais reellement envoye.
    await this.deps.notifications.send({
      to: email,
      channel: "EMAIL",
      template: "auth.password_reset",
      variables: { token },
    });
  }
}

export class ResetPasswordUseCase {
  constructor(private readonly deps: CoreDependencies) {}

  async execute(command: {
    token: string;
    password: string;
    ip?: string | undefined;
  }): Promise<void> {
    const now = this.deps.clock.now();
    const target = await this.deps.users.findByResetTokenHash(this.deps.tokens.hash(command.token));

    if (!target || !isTokenUsable(target.expiresAt, now)) {
      throw new InvalidResetTokenError();
    }

    await this.deps.users.replacePassword(
      target.id,
      await this.deps.passwords.hash(command.password),
    );

    // Changer de mot de passe invalide toutes les sessions existantes : un
    // attaquant deja connecte perd son acces au moment du changement.
    await this.deps.sessions.revokeAllForUser(target.id, now);

    await this.deps.audit.record({
      actorUserId: target.id,
      action: "auth.password_reset",
      resourceType: "user",
      resourceId: target.id,
      ip: command.ip,
    });
  }
}
