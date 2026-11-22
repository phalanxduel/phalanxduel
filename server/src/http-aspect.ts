/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Composable AOP route aspect for Fastify HTTP handlers in `@phalanxduel/server`.
 * Coordinates cross-cutting concerns (OpenTelemetry tracing + SLO latency
 * recording, DB availability fail-closed 503 guard, and optional JWT + active-user
 * authentication) at a single architectural seam without obscuring route logic.
 */

import type { Span } from '@opentelemetry/api';
import type { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import { db } from './db/index.js';
import { UserRepository } from './db/user-repo.js';
import { httpTraceContext, traceHttpHandler } from './tracing.js';

export type ServerDb = NonNullable<typeof db>;

export interface AuthenticatedUserClaims {
  readonly id: string;
  readonly gamertag: string;
  readonly suffix: number;
}

export interface RouteAspectOptions {
  /** Span / SLO operation name (e.g. 'social.follow', 'defaults'). */
  readonly operation: string;
  /** When true, fails closed with 503 DATABASE_UNAVAILABLE if `db` is not configured. */
  readonly requireDb?: boolean;
  /** When true, verifies bearer/cookie JWT + active non-disabled user, failing closed with 401. */
  readonly requireAuth?: boolean;
}

export interface RouteContext<
  T extends RouteGenericInterface = RouteGenericInterface,
  DbRequired extends boolean = false,
  AuthRequired extends boolean = false,
> {
  readonly request: FastifyRequest<T>;
  readonly reply: FastifyReply;
  readonly span: Span;
  readonly db: DbRequired extends true ? ServerDb : typeof db;
  readonly user: AuthRequired extends true
    ? AuthenticatedUserClaims
    : AuthenticatedUserClaims | null;
}

const defaultUserRepo = new UserRepository();

async function resolveActiveUser(
  request: FastifyRequest,
  userRepo: UserRepository,
): Promise<AuthenticatedUserClaims | null> {
  try {
    let token = request.headers.authorization?.replace(/^Bearer\s+/u, '');
    const reqWithCookies = request as FastifyRequest & {
      cookies?: Record<string, string | undefined>;
    };
    token ??= reqWithCookies.cookies?.phalanx_refresh;
    if (!token) return null;

    const decoded = request.server.jwt.verify<AuthenticatedUserClaims>(token);
    const user = await userRepo.getUserById(decoded.id);
    if (!user || user.isDisabled) return null;

    return decoded;
  } catch {
    return null;
  }
}

export function withRouteAspect<
  T extends RouteGenericInterface = RouteGenericInterface,
  DbRequired extends boolean = false,
  AuthRequired extends boolean = false,
>(
  options: {
    readonly operation: string;
    readonly requireDb?: DbRequired;
    readonly requireAuth?: AuthRequired;
    readonly userRepo?: UserRepository;
  },
  handler: (ctx: RouteContext<T, DbRequired, AuthRequired>) => Promise<unknown> | unknown,
) {
  return async (request: FastifyRequest<T>, reply: FastifyReply): Promise<unknown> => {
    let user: AuthenticatedUserClaims | null = null;
    if (options.requireAuth) {
      user = await resolveActiveUser(request, options.userRepo ?? defaultUserRepo);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      }
    }

    return traceHttpHandler(options.operation, httpTraceContext(request, reply), async (span) => {
      if (options.requireDb && !db) {
        return reply
          .status(503)
          .send({ error: 'Database not available', code: 'DATABASE_UNAVAILABLE' });
      }

      return handler({
        request,
        reply,
        span,
        db: db as DbRequired extends true ? ServerDb : typeof db,
        user: user as AuthRequired extends true
          ? AuthenticatedUserClaims
          : AuthenticatedUserClaims | null,
      });
    });
  };
}
