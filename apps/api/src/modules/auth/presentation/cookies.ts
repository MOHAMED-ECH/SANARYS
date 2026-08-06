import type { FastifyReply } from "fastify";
import { SESSION_TTL_MS } from "../domain/credentials.js";

/**
 * Gestion des cookies de session : purement presentation. Le domaine ignore
 * qu'une session voyage dans un cookie plutot que dans un en-tete.
 */

export const SESSION_COOKIE = "sanarys_session";
export const CSRF_COOKIE = "sanarys_csrf";
export const CSRF_HEADER = "x-sanarys-csrf";

const MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

export function setSessionCookies(
  reply: FastifyReply,
  tokens: { session: string; csrf: string },
  options: { secure: boolean },
): void {
  reply
    .setCookie(SESSION_COOKIE, tokens.session, {
      // Inaccessible au JavaScript de la page : un XSS ne peut pas voler la session.
      httpOnly: true,
      sameSite: "lax",
      secure: options.secure,
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    })
    // Lisible par le client, volontairement : il doit le renvoyer dans
    // l'en-tete anti-CSRF. C'est le principe de la double soumission.
    .setCookie(CSRF_COOKIE, tokens.csrf, {
      httpOnly: false,
      sameSite: "lax",
      secure: options.secure,
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
}

export function clearSessionCookies(reply: FastifyReply): FastifyReply {
  return reply.clearCookie(SESSION_COOKIE, { path: "/" }).clearCookie(CSRF_COOKIE, { path: "/" });
}
