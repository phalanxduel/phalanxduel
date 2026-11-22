/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * WebSocket transport, reliable message channel, heartbeat lifecycle,
 * and inbound message dispatch for `/ws`.
 */

import { randomUUID } from 'node:crypto';
import { SeverityNumber } from '@opentelemetry/api-logs';
import type { FastifyInstance } from 'fastify';
import type { RawData } from 'ws';
import {
  ClientMessageSchema,
  DEV_PORTS,
  PROTOCOL_TIMING,
  ServerMessageSchema,
  formatGamertag,
  type ClientMessage,
  type GameOptions,
  type ServerMessage,
} from '@phalanxduel/shared';
import { ActionError, MatchError, type BotMatchOptions, type IMatchManager } from './match.js';
import { MatchmakingQueueService } from './matchmaking-queue.js';
import { emitOtlpLog } from './instrument.js';
import { traceWsMessage } from './tracing.js';
import {
  actionsDurationMs,
  actionResults,
  actionsTotal,
  featureEvents,
  matchesActive,
  sloViolations,
  trackProcess,
  wsConnections,
} from './metrics.js';

function resolveCreateMatchSeed(msg: { rngSeed?: number }): number | undefined {
  return msg.rngSeed;
}

interface ClientMessageReceipt {
  matchId?: string;
  responses: ServerMessage[];
  storedAt: number;
}

const TRANSPORT_RECEIPT_TTL_MS = PROTOCOL_TIMING.transportReceiptTtlMs;
const APP_HEARTBEAT_INTERVAL_MS = PROTOCOL_TIMING.heartbeatIntervalMs;
const APP_HEARTBEAT_TIMEOUT_MS = PROTOCOL_TIMING.heartbeatTimeoutMs;
const LOCAL_DEV_HTTP_ORIGINS = [
  `http://localhost:${DEV_PORTS.server}`,
  `http://localhost:${DEV_PORTS.client}`,
  `http://127.0.0.1:${DEV_PORTS.server}`,
  `http://127.0.0.1:${DEV_PORTS.client}`,
  'https://play.phalanxduel.localhost',
  'https://admin.phalanxduel.localhost',
  'https://phalanxduel.localhost',
  'https://play.lan.phalanxduel.com',
  'https://admin.lan.phalanxduel.com',
  'https://lan.phalanxduel.com',
  'https://www.lan.phalanxduel.com',
] as const;

function isTransportOnlyServerMessage(message: ServerMessage): boolean {
  return message.type === 'ack' || message.type === 'ping' || message.type === 'pong';
}

export function registerWebSocketRoute(app: FastifyInstance, matchManager: IMatchManager): void {
  // ── Ranked Matchmaking Queue ─────────────────────────────────────
  const matchmakingQueue = new MatchmakingQueueService(
    matchManager,
    (sock, payload) => {
      if (sock.readyState === 1) sock.send(JSON.stringify(payload));
    },
    app.log,
  );

  // ── WebSocket routing ────────────────────────────────────────────
  const wsConnectionsByIp = new Map<string, number>();
  const recentClientReceipts = new Map<string, ClientMessageReceipt>();
  const MAX_WS_PER_IP = 100;

  // ── WebSocket Protocol Helpers ────────────────────────────────────
  function resolveWsCreateMatchGameOptions(
    msg: Extract<ClientMessage, { type: 'createMatch' }>,
  ): GameOptions | undefined {
    if (!msg.gameOptions) return undefined;
    return {
      damageMode: msg.gameOptions.damageMode,
      startingLifepoints: msg.gameOptions.startingLifepoints,
      classicDeployment: msg.gameOptions.classicDeployment,
      // quickStart is stripped in production to prevent abuse
      quickStart: process.env.NODE_ENV === 'production' ? undefined : msg.gameOptions.quickStart,
    };
  }

  function resolveWsCreateMatchBotOptions(
    msg: Extract<ClientMessage, { type: 'createMatch' }>,
  ): BotMatchOptions | undefined {
    if (
      msg.opponent !== 'bot-random' &&
      msg.opponent !== 'bot-heuristic' &&
      msg.opponent !== 'bot-mcts'
    ) {
      return undefined;
    }

    const strategy =
      msg.opponent === 'bot-mcts'
        ? ('mcts' as const)
        : msg.opponent === 'bot-heuristic'
          ? ('heuristic' as const)
          : ('random' as const);

    let mctsIterations: number | undefined;
    if (msg.opponent === 'bot-mcts') {
      mctsIterations =
        msg.botDifficulty === 'hard' ? 2000 : msg.botDifficulty === 'medium' ? 500 : 100;
    }

    return {
      opponent: msg.opponent,
      difficulty: msg.botDifficulty,
      botConfig: {
        strategy,
        mctsIterations,
        seed: Date.now(),
      },
    };
  }

  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, async (socket, req) => {
      const clientIp = req.ip;

      // 0. Connection Limiting by IP (OWASP: DoS Prevention)
      const currentCount = wsConnectionsByIp.get(clientIp) ?? 0;
      if (currentCount >= MAX_WS_PER_IP) {
        app.log.warn({ clientIp }, 'WebSocket connection rejected: Too many connections from IP');
        socket.close(1008, 'Too many connections from this IP');
        return;
      }
      wsConnectionsByIp.set(clientIp, currentCount + 1);

      // 1. Optional Authentication
      let authUser: { id: string; name: string } | null = null;
      try {
        const token =
          req.cookies.phalanx_refresh ??
          req.cookies.token ??
          req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          const p = fastify.jwt.verify<{
            id: string;
            gamertag: string;
            suffix: number;
            name?: string;
          }>(token);
          const suffixStr =
            typeof p.suffix === 'number' ? String(p.suffix).padStart(4, '0') : '0000';
          authUser = {
            id: p.id,
            name: p.name ?? `${p.gamertag}#${suffixStr}`,
          };
        }
      } catch {
        // Auth is optional for now, so we just continue as guest
      }

      const isDev = (process.env.NODE_ENV ?? 'development') === 'development';
      const isTest = process.env.NODE_ENV === 'test';
      const enforceOrigin = process.env.PHALANX_ENFORCE_ORIGIN === '1';
      const origin = req.headers.origin;

      const allowedOrigins = [
        'https://phalanxduel.fly.dev',
        'https://phalanxduel-staging.fly.dev',
        'https://play.phalanxduel.com',
        'https://phalanxduel.com',
        ...LOCAL_DEV_HTTP_ORIGINS,
      ];

      if (!isDev || isTest || enforceOrigin) {
        if (!origin) {
          app.log.warn({ clientIp }, 'WebSocket connection rejected: Missing Origin');
          socket.close(1008, 'Origin required');
          return;
        }

        if (origin && !allowedOrigins.includes(origin)) {
          app.log.warn({ origin, clientIp }, 'WebSocket connection rejected: Invalid Origin');
          socket.close(1008, 'Invalid Origin');
          return;
        }
      }

      void trackProcess('ws.connection', {}, () => {
        wsConnections.add(1);

        // 3. Transport liveness: native control-frame ping/pong plus app-level ping/pong.
        let isAlive = true;
        let lastClientHeartbeatAt = Date.now();
        socket.on('pong', () => {
          isAlive = true;
        });

        const controlPingInterval = setInterval(() => {
          if (!isAlive) {
            app.log.info({ clientIp }, 'Closing dead WebSocket connection (no pong)');
            socket.terminate();
            return;
          }
          isAlive = false;
          socket.ping();
        }, APP_HEARTBEAT_INTERVAL_MS);

        // Rate limiting: 50 messages per second sliding window
        const MSG_LIMIT = 50;
        const WINDOW_MS = 1000;
        const timestamps: number[] = [];

        function cleanupReceipts(): void {
          const cutoff = Date.now() - TRANSPORT_RECEIPT_TTL_MS;
          for (const [msgId, receipt] of recentClientReceipts) {
            if (receipt.storedAt < cutoff) {
              recentClientReceipts.delete(msgId);
            }
          }
        }

        function sendMessage(msg: ServerMessage, responseCapture?: ServerMessage[]): void {
          if (
            process.env.NODE_ENV !== 'production' ||
            process.env.PHALANX_VERIFY_OUTBOUND === '1'
          ) {
            const result = ServerMessageSchema.safeParse(msg);
            if (!result.success) {
              app.log.error(
                { errors: result.error.issues, msg, clientIp },
                'Outbound Server Message Validation Failed',
              );
              // In non-production, we might want to throw or send an error,
              // but for advisory mode we just log it.
            }
          }
          if (socket.readyState === 1) {
            const serialized = JSON.stringify(msg);
            if (process.env.PHALANX_DEBUG_WS === '1') {
              emitOtlpLog(
                SeverityNumber.DEBUG,
                'DEBUG',
                `[server] SENDING WS: ${serialized.substring(0, 100)}...`,
              );
            }
            socket.send(serialized);
          }
          if (responseCapture && !isTransportOnlyServerMessage(msg)) {
            responseCapture.push(msg);
          }
        }

        function sendAck(ackedMsgId: string): void {
          sendMessage({ type: 'ack', ackedMsgId });
        }

        function recordReceipt(
          msgId: string | undefined,
          responseCapture: ServerMessage[],
          matchId?: string,
        ): void {
          if (!msgId) return;
          recentClientReceipts.set(msgId, {
            matchId,
            responses: responseCapture,
            storedAt: Date.now(),
          });
        }

        function replayReceipt(msgId: string): boolean {
          cleanupReceipts();
          const receipt = recentClientReceipts.get(msgId);
          if (!receipt) return false;
          for (const response of receipt.responses) {
            sendMessage(response);
          }
          if (receipt.matchId) {
            matchManager.broadcastMatchState(receipt.matchId);
          }
          sendAck(msgId);
          return true;
        }

        function preprocessMessage(raw: RawData): string | null {
          // Payload size limit (10KB) (OWASP: DoS Prevention)
          const size = Array.isArray(raw)
            ? raw.reduce((acc, b) => acc + b.length, 0)
            : raw instanceof ArrayBuffer
              ? raw.byteLength
              : raw.length;

          if (size > 10240) {
            app.log.warn({ size, clientIp }, 'WebSocket message rejected: Payload too large');
            socket.close(1009, 'Message too large');
            return null;
          }

          // Rate limit check
          const now = Date.now();
          while (timestamps.length > 0 && (timestamps[0] ?? 0) <= now - WINDOW_MS) {
            timestamps.shift();
          }
          if (timestamps.length >= MSG_LIMIT) {
            sendMessage({ type: 'matchError', error: 'Too many messages', code: 'RATE_LIMITED' });
            return null;
          }
          timestamps.push(now);

          return typeof raw === 'string'
            ? raw
            : Buffer.isBuffer(raw)
              ? raw.toString()
              : raw instanceof ArrayBuffer
                ? Buffer.from(raw).toString()
                : String(raw);
        }

        const appHeartbeatInterval = setInterval(() => {
          if (Date.now() - lastClientHeartbeatAt > APP_HEARTBEAT_TIMEOUT_MS) {
            app.log.info(
              { clientIp },
              'Closing stale WebSocket connection (app heartbeat timeout)',
            );
            socket.close(4001, 'Heartbeat timeout');
            return;
          }

          sendMessage({
            type: 'ping',
            msgId: randomUUID(),
            timestamp: new Date().toISOString(),
          });
        }, APP_HEARTBEAT_INTERVAL_MS);

        socket.on('message', (raw: RawData) => {
          // eslint-disable-next-line complexity -- WebSocket protocol dispatch is intentionally centralized here.
          void (async () => {
            try {
              const messageStr = preprocessMessage(raw);
              if (messageStr === null) return;
              if (process.env.PHALANX_DEBUG_WS === '1') {
                emitOtlpLog(
                  SeverityNumber.DEBUG,
                  'DEBUG',
                  `[server] RECEIVED WS: ${messageStr.substring(0, 100)}...`,
                );
              }

              let parsed: unknown;
              try {
                parsed = JSON.parse(messageStr);
              } catch {
                sendMessage({ type: 'matchError', error: 'Invalid JSON', code: 'PARSE_ERROR' });
                return;
              }

              const result = ClientMessageSchema.safeParse(parsed);
              if (!result.success) {
                app.log.error(
                  { errors: result.error.issues, parsed, clientIp },
                  'Invalid Client Message',
                );
                sendMessage({
                  type: 'matchError',
                  error: 'Invalid message format',
                  code: 'VALIDATION_ERROR',
                });
                return;
              }

              const msg = result.data;
              lastClientHeartbeatAt = Date.now();

              if ('msgId' in msg && typeof msg.msgId === 'string' && replayReceipt(msg.msgId)) {
                return;
              }

              switch (msg.type) {
                case 'ack':
                  break;

                case 'ping':
                  sendMessage({
                    type: 'pong',
                    timestamp: new Date().toISOString(),
                    replyTo: msg.msgId,
                  });
                  break;

                case 'pong':
                  break;

                case 'createMatch': {
                  const responseCapture: ServerMessage[] = [];
                  void traceWsMessage('createMatch', {}, msg.telemetry, async (span) => {
                    try {
                      const resolvedSeed = resolveCreateMatchSeed(msg);
                      if (process.env.APP_ENV === 'production' && resolvedSeed !== undefined) {
                        throw new MatchError(
                          'rngSeed is not allowed in production',
                          'SEED_NOT_ALLOWED',
                        );
                      }

                      const gameOptions = resolveWsCreateMatchGameOptions(msg);
                      const botOptions = resolveWsCreateMatchBotOptions(msg);
                      const { matchId, playerId, playerIndex } = await matchManager.createMatch(
                        authUser?.name ?? msg.playerName,
                        socket,
                        {
                          gameOptions,
                          rngSeed: resolvedSeed,
                          botOptions,
                          matchParams: msg.matchParams,
                          userId: authUser?.id,
                          creatorIp: clientIp,
                          visibility: msg.visibility === 'public_open' ? 'public_open' : 'private',
                          isAutomated: msg.isAgent === true,
                        },
                      );
                      span.setAttribute('match.id', matchId);
                      matchesActive.add(1);
                      app.log.info(
                        {
                          event: 'match_session',
                          sessionEvent: 'created',
                          matchId,
                          playerId,
                          playerIndex,
                          playerName: authUser?.name ?? msg.playerName,
                        },
                        `match:create ${matchId}`,
                      );
                      sendMessage(
                        {
                          type: 'matchCreated',
                          matchId,
                          playerId,
                          playerIndex,
                          gameOptions,
                        },
                        responseCapture,
                      );
                      // For bot matches the game is already initialized;
                      // broadcast state after matchCreated so the client sets playerIndex first.
                      if (botOptions) {
                        matchManager.broadcastMatchState(matchId);
                      }
                      recordReceipt(msg.msgId, responseCapture, matchId);
                      if (msg.msgId) sendAck(msg.msgId);
                    } catch (err) {
                      if (err instanceof MatchError) {
                        sendMessage(
                          { type: 'matchError', error: err.message, code: err.code },
                          responseCapture,
                        );
                      } else {
                        const error = err instanceof Error ? err.message : 'Unknown error';
                        sendMessage(
                          { type: 'matchError', error, code: 'CREATE_FAILED' },
                          responseCapture,
                        );
                      }
                      recordReceipt(msg.msgId, responseCapture);
                      if (msg.msgId) sendAck(msg.msgId);
                    }
                  });
                  break;
                }

                case 'joinMatch': {
                  const responseCapture: ServerMessage[] = [];
                  void traceWsMessage(
                    'joinMatch',
                    { 'match.id': msg.matchId },
                    msg.telemetry,
                    async (span) => {
                      try {
                        const { playerId, playerIndex } = await matchManager.joinMatch(
                          msg.matchId,
                          authUser?.name ?? msg.playerName,
                          socket,
                          authUser?.id,
                        );
                        span.setAttribute('player.id', playerId);
                        app.log.info(
                          {
                            event: 'match_session',
                            sessionEvent: 'joined',
                            matchId: msg.matchId,
                            playerId,
                            playerIndex,
                            playerName: authUser?.name ?? msg.playerName,
                          },
                          `match:join ${msg.matchId}`,
                        );
                        // Send matchJoined to joining player BEFORE broadcasting state
                        sendMessage(
                          {
                            type: 'matchJoined',
                            matchId: msg.matchId,
                            playerId,
                            playerIndex,
                          },
                          responseCapture,
                        );
                        matchManager.broadcastMatchState(msg.matchId);
                        recordReceipt(msg.msgId, responseCapture, msg.matchId);
                        if (msg.msgId) sendAck(msg.msgId);
                      } catch (err) {
                        if (err instanceof MatchError) {
                          sendMessage(
                            { type: 'matchError', error: err.message, code: err.code },
                            responseCapture,
                          );
                        } else {
                          const error = err instanceof Error ? err.message : 'Unknown error';
                          sendMessage(
                            { type: 'matchError', error, code: 'JOIN_FAILED' },
                            responseCapture,
                          );
                        }
                        recordReceipt(msg.msgId, responseCapture, msg.matchId);
                        if (msg.msgId) sendAck(msg.msgId);
                      }
                    },
                  );
                  break;
                }

                case 'rejoinMatch': {
                  const responseCapture: ServerMessage[] = [];
                  void traceWsMessage(
                    'rejoinMatch',
                    { 'match.id': msg.matchId },
                    msg.telemetry,
                    async (span) => {
                      try {
                        const { playerIndex } = await matchManager.rejoinMatch(
                          msg.matchId,
                          msg.playerId,
                          socket,
                          authUser?.id,
                        );
                        span.setAttribute('player.id', msg.playerId);
                        app.log.info(
                          {
                            event: 'match_session',
                            sessionEvent: 'rejoined',
                            matchId: msg.matchId,
                            playerId: msg.playerId,
                            playerIndex,
                          },
                          `match:rejoin ${msg.matchId}`,
                        );
                        sendMessage(
                          {
                            type: 'matchJoined',
                            matchId: msg.matchId,
                            playerId: msg.playerId,
                            playerIndex,
                          },
                          responseCapture,
                        );
                        matchManager.broadcastMatchState(msg.matchId);
                        recordReceipt(msg.msgId, responseCapture, msg.matchId);
                        if (msg.msgId) sendAck(msg.msgId);
                      } catch (err) {
                        if (err instanceof MatchError) {
                          sendMessage(
                            { type: 'matchError', error: err.message, code: err.code },
                            responseCapture,
                          );
                        } else {
                          const error = err instanceof Error ? err.message : 'Unknown error';
                          sendMessage(
                            { type: 'matchError', error, code: 'REJOIN_FAILED' },
                            responseCapture,
                          );
                        }
                        recordReceipt(msg.msgId, responseCapture, msg.matchId);
                        if (msg.msgId) sendAck(msg.msgId);
                      }
                    },
                  );
                  break;
                }

                case 'watchMatch': {
                  const responseCapture: ServerMessage[] = [];
                  void traceWsMessage(
                    'watchMatch',
                    { 'match.id': msg.matchId },
                    msg.telemetry,
                    async (span) => {
                      try {
                        const { spectatorId } = await matchManager.watchMatch(msg.matchId, socket);
                        span.setAttribute('spectator.id', spectatorId);
                        sendMessage(
                          { type: 'spectatorJoined', matchId: msg.matchId, spectatorId },
                          responseCapture,
                        );
                        // Broadcast state after sending spectatorJoined so client sets isSpectator first
                        matchManager.broadcastMatchState(msg.matchId);
                        recordReceipt(msg.msgId, responseCapture, msg.matchId);
                        if (msg.msgId) sendAck(msg.msgId);
                      } catch (err) {
                        if (err instanceof MatchError) {
                          sendMessage(
                            { type: 'matchError', error: err.message, code: err.code },
                            responseCapture,
                          );
                        } else {
                          const error = err instanceof Error ? err.message : 'Unknown error';
                          sendMessage(
                            { type: 'matchError', error, code: 'WATCH_FAILED' },
                            responseCapture,
                          );
                        }
                        recordReceipt(msg.msgId, responseCapture, msg.matchId);
                        if (msg.msgId) sendAck(msg.msgId);
                      }
                    },
                  );
                  break;
                }

                case 'authenticate': {
                  const responseCapture: ServerMessage[] = [];
                  try {
                    const authPayload = fastify.jwt.verify<{
                      id: string;
                      gamertag: string;
                      suffix: number;
                    }>(msg.token);
                    const displayName = formatGamertag(authPayload.gamertag, authPayload.suffix);
                    authUser = { id: authPayload.id, name: displayName };
                    matchManager.updatePlayerIdentity(socket, authPayload.id, displayName);
                    sendMessage(
                      {
                        type: 'authenticated',
                        user: { id: authPayload.id, name: displayName, elo: 0 },
                      },
                      responseCapture,
                    );
                  } catch {
                    sendMessage({ type: 'auth_error', error: 'Invalid token' }, responseCapture);
                  }
                  recordReceipt(msg.msgId, responseCapture);
                  if (msg.msgId) sendAck(msg.msgId);
                  break;
                }

                case 'action': {
                  const responseCapture: ServerMessage[] = [];
                  const socketInfo = matchManager.getSocketInfo(socket);
                  if (!socketInfo || socketInfo.isSpectator) {
                    sendMessage(
                      {
                        type: 'matchError',
                        error: 'Not connected to a match',
                        code: 'NOT_IN_MATCH',
                      },
                      responseCapture,
                    );
                    recordReceipt(msg.msgId, responseCapture, msg.matchId);
                    if (msg.msgId) sendAck(msg.msgId);
                    return;
                  }

                  traceWsMessage(
                    'action',
                    {
                      'match.id': msg.matchId,
                      'player.id': socketInfo.playerId,
                      'action.type': msg.action.type,
                    },
                    msg.telemetry,
                    async (_span) => {
                      await trackProcess(
                        'game.action',
                        {
                          'action.type': msg.action.type,
                          'match.id': msg.matchId,
                        },
                        async () => {
                          const start = performance.now();

                          try {
                            const action = { ...msg.action, msgId: msg.msgId };
                            await matchManager.handleAction(
                              msg.matchId,
                              socketInfo.playerId,
                              action,
                              msg.telemetry?.qaRunId,
                            );
                            actionsTotal.add(1, { 'action.type': msg.action.type });
                            const durationMs = performance.now() - start;
                            actionsDurationMs.record(durationMs);
                            if (durationMs > 1000) {
                              sloViolations.add('game-action-latency', 'ws.action', {
                                'action.type': msg.action.type,
                              });
                            }
                            actionResults.add('accepted', msg.action.type);
                            featureEvents.add('gameplay', 'action_accepted', {
                              'action.type': msg.action.type,
                            });

                            // Emit the transaction log entry to the Pino log stream so the
                            // game can be tailed in real-time: tail -f logs/server.log | jq .
                            const txEntry = matchManager
                              .getMatchSync(msg.matchId)
                              ?.state?.transactionLog?.at(-1);
                            if (txEntry) {
                              const loggedDetails =
                                txEntry.action.type === 'deploy' && txEntry.details.type === 'pass'
                                  ? { ...txEntry.details, type: 'deploy' as const }
                                  : txEntry.details;
                              app.log.info(
                                {
                                  event: 'game_action',
                                  matchId: msg.matchId,
                                  playerId: socketInfo.playerId,
                                  turn: txEntry.sequenceNumber,
                                  action: txEntry.action.type,
                                  details: loggedDetails,
                                  stateHash: txEntry.stateHashAfter,
                                },
                                `game:${txEntry.action.type} t${txEntry.sequenceNumber}`,
                              );
                            }
                            recordReceipt(msg.msgId, responseCapture, msg.matchId);
                            if (msg.msgId) sendAck(msg.msgId);
                          } catch (err) {
                            console.error('[WS_ACTION_ERROR]', err);
                            actionsDurationMs.record(performance.now() - start);
                            actionResults.add(
                              'rejected',
                              msg.action.type,
                              err instanceof ActionError || err instanceof MatchError
                                ? err.code
                                : 'ACTION_FAILED',
                            );
                            if (err instanceof ActionError) {
                              sendMessage(
                                {
                                  type: 'actionError',
                                  error: err.message,
                                  code: err.code,
                                },
                                responseCapture,
                              );
                            } else if (err instanceof MatchError) {
                              sendMessage(
                                { type: 'matchError', error: err.message, code: err.code },
                                responseCapture,
                              );
                            } else {
                              const error = err instanceof Error ? err.message : 'Unknown error';
                              sendMessage(
                                {
                                  type: 'actionError',
                                  error,
                                  code: 'ACTION_FAILED',
                                },
                                responseCapture,
                              );
                            }
                            recordReceipt(msg.msgId, responseCapture, msg.matchId);
                            if (msg.msgId) sendAck(msg.msgId);
                            throw err; // Re-throw so trackProcess records the error
                          }
                        },
                      );
                    },
                  ).catch(() => {
                    // Errors are already sent as WebSocket messages (line 943-956)
                    // and recorded on OTel spans via re-throw through withActiveSpan.
                    // Swallow the final rejection to prevent unhandled promise rejection.
                  });
                  break;
                }

                case 'joinQueue': {
                  const responseCapture: ServerMessage[] = [];
                  if (!authUser) {
                    sendMessage(
                      {
                        type: 'matchError',
                        error: 'Authentication required',
                        code: 'AUTH_REQUIRED',
                      },
                      responseCapture,
                    );
                    recordReceipt(msg.msgId, responseCapture);
                    if (msg.msgId) sendAck(msg.msgId);
                    break;
                  }
                  await matchmakingQueue.join(authUser.id, 0, authUser.name, socket);
                  sendMessage(
                    { type: 'queueJoined', queueSize: matchmakingQueue.size },
                    responseCapture,
                  );
                  recordReceipt(msg.msgId, responseCapture);
                  if (msg.msgId) sendAck(msg.msgId);
                  break;
                }

                case 'leaveQueue': {
                  const responseCapture: ServerMessage[] = [];
                  if (authUser) matchmakingQueue.leave(authUser.id);
                  sendMessage({ type: 'queueLeft', reason: 'cancelled' }, responseCapture);
                  recordReceipt(msg.msgId, responseCapture);
                  if (msg.msgId) sendAck(msg.msgId);
                  break;
                }
              }
            } catch (err) {
              app.log.error(err, 'WebSocket message handler failed');
            }
          })();
        });

        socket.on('close', () => {
          clearInterval(controlPingInterval);
          clearInterval(appHeartbeatInterval);
          wsConnections.add(-1);
          matchmakingQueue.removeBySocket(socket);
          matchManager.handleDisconnect(socket);

          // Decrement IP-based connection counter
          const count = wsConnectionsByIp.get(clientIp) ?? 1;
          if (count <= 1) {
            wsConnectionsByIp.delete(clientIp);
          } else {
            wsConnectionsByIp.set(clientIp, count - 1);
          }

          app.log.info({ clientIp }, 'WebSocket client disconnected');
        });
      });
    });
  });
}
