import type { PrismaClient } from "@sanarys/db";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { NotificationPort } from "../../integrations/notifications/index.js";
import type { AuditTrailPort } from "../../shared/audit/audit-trail.js";
import {
  Sha256TokenGenerator,
  type TokenGeneratorPort,
} from "../../shared/cryptography/token-generator.js";
import { SystemClock, type ClockPort } from "../../shared/time/system-clock.js";
import {
  AcceptInviteUseCase,
  CompleteMfaLogInUseCase,
  CreateInviteUseCase,
  GetCurrentUserUseCase,
  LogInUseCase,
  LogOutUseCase,
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
  ResolveSessionUseCase,
} from "./application/use-cases.js";
import {
  ConfirmMfaEnrollmentUseCase,
  DisableMfaUseCase,
  GetMfaStatusUseCase,
  StartMfaEnrollmentUseCase,
  VerifyMfaCodeUseCase,
} from "./application/mfa-use-cases.js";
import { Argon2PasswordHasher } from "./infrastructure/argon2-password-hasher.js";
import { PrismaSessionRepository } from "./infrastructure/prisma-session-repository.js";
import { PrismaUserAccountRepository } from "./infrastructure/prisma-user-repository.js";
import {
  PrismaMfaChallengeRepository,
  PrismaMfaRepository,
} from "./infrastructure/prisma-mfa-repository.js";
import { createAuthRoutes } from "./presentation/routes.js";

/**
 * API publique du module auth (guide, section 3.3).
 *
 * `resolveSession` sert au plugin d'authentification, `createInvite` au module
 * organizations : les deux passent par cette interface, jamais par les tables
 * de comptes ou de sessions.
 */

export { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE } from "./presentation/cookies.js";
export type { UserProfile } from "./domain/ports.js";

export interface AuthModule {
  readonly logIn: LogInUseCase;
  readonly logOut: LogOutUseCase;
  readonly resolveSession: ResolveSessionUseCase;
  readonly getCurrentUser: GetCurrentUserUseCase;
  readonly createInvite: CreateInviteUseCase;
  readonly acceptInvite: AcceptInviteUseCase;
  readonly requestPasswordReset: RequestPasswordResetUseCase;
  readonly resetPassword: ResetPasswordUseCase;

  // Second facteur (TOTP).
  readonly completeMfaLogIn: CompleteMfaLogInUseCase;
  readonly getMfaStatus: GetMfaStatusUseCase;
  readonly startMfaEnrollment: StartMfaEnrollmentUseCase;
  readonly confirmMfaEnrollment: ConfirmMfaEnrollmentUseCase;
  readonly disableMfa: DisableMfaUseCase;

  /** Jeton anti-CSRF a poser en cookie lisible par le client. */
  readonly newCsrfToken: () => string;
}

export interface AuthModuleDependencies {
  readonly prisma: PrismaClient;
  readonly notifications: NotificationPort;
  readonly audit: AuditTrailPort;
  readonly clock?: ClockPort | undefined;
  readonly tokens?: TokenGeneratorPort | undefined;
}

export function createAuthModule(deps: AuthModuleDependencies): AuthModule {
  const users = new PrismaUserAccountRepository(deps.prisma);
  const sessions = new PrismaSessionRepository(deps.prisma);
  const passwords = new Argon2PasswordHasher();
  const tokens = deps.tokens ?? new Sha256TokenGenerator();
  const clock = deps.clock ?? new SystemClock();

  const mfa = new PrismaMfaRepository(deps.prisma);
  const challenges = new PrismaMfaChallengeRepository(deps.prisma);

  const core = { users, sessions, passwords, tokens, clock, audit: deps.audit };
  const mfaCore = { ...core, mfa };

  // La verification du code est injectee plutot qu'importee : le cas d'usage
  // de connexion n'a pas a connaitre TOTP ni les codes de secours.
  const verifyMfaCode = new VerifyMfaCodeUseCase(mfaCore);

  return {
    logIn: new LogInUseCase({ ...core, challenges }),
    completeMfaLogIn: new CompleteMfaLogInUseCase({
      ...core,
      challenges,
      verifyCode: (command) => verifyMfaCode.execute(command),
    }),
    getMfaStatus: new GetMfaStatusUseCase(mfa),
    startMfaEnrollment: new StartMfaEnrollmentUseCase({ mfa, users }),
    confirmMfaEnrollment: new ConfirmMfaEnrollmentUseCase(mfaCore),
    disableMfa: new DisableMfaUseCase(mfaCore),
    logOut: new LogOutUseCase(core),
    resolveSession: new ResolveSessionUseCase(core),
    getCurrentUser: new GetCurrentUserUseCase(users),
    createInvite: new CreateInviteUseCase(core),
    acceptInvite: new AcceptInviteUseCase(core),
    requestPasswordReset: new RequestPasswordResetUseCase({
      users,
      tokens,
      clock,
      notifications: deps.notifications,
    }),
    resetPassword: new ResetPasswordUseCase(core),
    newCsrfToken: () => tokens.generate(),
  };
}

export function authRoutes(module: AuthModule): FastifyPluginAsyncZod {
  return createAuthRoutes(module);
}
