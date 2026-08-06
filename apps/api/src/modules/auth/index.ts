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
  CreateInviteUseCase,
  GetCurrentUserUseCase,
  LogInUseCase,
  LogOutUseCase,
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
  ResolveSessionUseCase,
} from "./application/use-cases.js";
import { Argon2PasswordHasher } from "./infrastructure/argon2-password-hasher.js";
import { PrismaSessionRepository } from "./infrastructure/prisma-session-repository.js";
import { PrismaUserAccountRepository } from "./infrastructure/prisma-user-repository.js";
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

  const core = { users, sessions, passwords, tokens, clock, audit: deps.audit };

  return {
    logIn: new LogInUseCase(core),
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
