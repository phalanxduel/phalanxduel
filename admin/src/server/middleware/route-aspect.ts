/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Composable AOP route aspects for `@phalanxduel/admin` Fastify handlers.
 * Keeps `auth.ts` focused on authentication primitives while coordinating
 * admin auth enforcement and internal game-server proxying in one seam.
 */

import type { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import { adminInternalToken, gameServerInternalUrl } from '../config.js';
import { requireAdmin, type AdminUser } from './auth.js';

/**
 * AOP route aspect: enforces admin authentication before invoking the handler,
 * injecting the verified `AdminUser` so routes cannot forget the auth guard.
 */
export function withAdmin<T extends RouteGenericInterface = RouteGenericInterface>(
  handler: (
    request: FastifyRequest<T>,
    reply: FastifyReply,
    admin: AdminUser,
  ) => Promise<unknown> | unknown,
) {
  return async (request: FastifyRequest<T>, reply: FastifyReply): Promise<unknown> => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    return handler(request, reply, admin);
  };
}

export interface AdminProxyContext {
  readonly admin: AdminUser;
  readonly gameServerUrl: string;
  readonly token: string;
  /** Performs an authenticated request to the game server, returning null after sending 502 on network failure. */
  readonly fetchUpstream: (path: string, init?: RequestInit) => Promise<Response | null>;
}

/**
 * Composed AOP route aspect for admin routes that proxy to the game server's
 * `/internal/*` API: enforces admin auth, fails closed with 503 if
 * `ADMIN_INTERNAL_TOKEN` is missing, and wraps upstream fetches with 502 handling.
 */
export function withAdminProxy<T extends RouteGenericInterface = RouteGenericInterface>(
  handler: (
    request: FastifyRequest<T>,
    reply: FastifyReply,
    ctx: AdminProxyContext,
  ) => Promise<unknown> | unknown,
) {
  return withAdmin<T>(async (request, reply, admin) => {
    const token = adminInternalToken();
    if (!token) {
      return reply
        .status(503)
        .send({ error: 'Admin token not configured', code: 'NOT_CONFIGURED' });
    }
    const gameServerUrl = gameServerInternalUrl();
    const fetchUpstream = async (
      path: string,
      init: RequestInit = {},
    ): Promise<Response | null> => {
      try {
        return await fetch(`${gameServerUrl}${path}`, {
          ...init,
          headers: {
            ...(init.headers ?? {}),
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        void reply.status(502).send({ error: 'Game server unreachable', code: 'UPSTREAM_ERROR' });
        return null;
      }
    };
    return handler(request, reply, { admin, gameServerUrl, token, fetchUpstream });
  });
}
