import type { MembershipRole, OrgType, StaffRole } from "@sanarys/db";
import type { LockoutState } from "./credentials.js";

/**
 * Ports du module auth.
 *
 * Aucune de ces interfaces ne mentionne Prisma, argon2 ni un fournisseur
 * d'identite. C'est la condition pour que le remplacement par un OIDC — point
 * bloquant avant mise en production — ne touche que l'infrastructure.
 */

/** Modele de lecture d'un compte. Ne contient jamais d'empreinte de mot de passe. */
export interface UserAccount {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly staffRole: StaffRole | null;
}

export interface OrganizationMembershipView {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly organizationType: OrgType;
  readonly role: MembershipRole;
}

export interface UserProfile extends UserAccount {
  readonly memberships: readonly OrganizationMembershipView[];
}

/** Etat d'authentification interne : ne franchit jamais la frontiere du module. */
export interface AuthenticatableUser extends UserAccount {
  readonly passwordHash: string | null;
  readonly status: string;
  readonly lockout: LockoutState;
}

export interface UserAccountRepository {
  findAuthenticatableByEmail(email: string): Promise<AuthenticatableUser | null>;
  findProfile(userId: string): Promise<UserProfile | null>;
  findIdByEmail(email: string): Promise<string | null>;

  updateLockout(userId: string, state: LockoutState): Promise<void>;

  /** Retourne le compte cible d'un jeton, avec son echeance, ou null. */
  findByInviteTokenHash(hash: string): Promise<{ id: string; expiresAt: Date | null } | null>;
  findByResetTokenHash(hash: string): Promise<{ id: string; expiresAt: Date | null } | null>;

  storeInviteToken(userId: string, hash: string, expiresAt: Date): Promise<void>;
  storeResetToken(userId: string, hash: string, expiresAt: Date): Promise<void>;

  /** Active le compte et consomme l'invitation. */
  activateWithPassword(userId: string, passwordHash: string, activatedAt: Date): Promise<void>;
  /** Remplace le mot de passe, consomme le jeton et remet le verrouillage a zero. */
  replacePassword(userId: string, passwordHash: string): Promise<void>;
}

export interface SessionRecord {
  readonly id: string;
  readonly userId: string;
}

export interface SessionRepository {
  create(data: {
    userId: string;
    tokenHash: string;
    ip: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<SessionRecord>;
  /** Retourne la session si elle existe, n'est ni revoquee ni expiree. */
  findActiveByTokenHash(tokenHash: string, now: Date): Promise<SessionRecord | null>;
  revoke(sessionId: string, revokedAt: Date): Promise<void>;
  revokeAllForUser(userId: string, revokedAt: Date): Promise<void>;
}

/**
 * Hachage des mots de passe. Isole derriere un port pour que changer
 * d'algorithme ou de parametres de cout ne touche pas les cas d'usage.
 */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
  /**
   * Consomme le meme temps qu'une verification reelle, sans compte a verifier.
   * Sert a ne pas reveler l'existence d'un compte par le temps de reponse.
   */
  consumeTime(password: string): Promise<void>;
}
