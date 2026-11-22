/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Zod-validated runtime configuration for `@phalanxduel/mcp`.
 */

import { z } from 'zod';
import { DEV_PORTS } from '@phalanxduel/shared';

function optionalNonEmptyString(fallback: string) {
  return z.preprocess(
    (val) => (typeof val === 'string' && val.trim().length > 0 ? val.trim() : fallback),
    z.string().min(1),
  );
}

function optionalTrimmedString() {
  return z.preprocess(
    (val) => (typeof val === 'string' && val.trim().length > 0 ? val.trim() : undefined),
    z.string().min(1).optional(),
  );
}

const McpConfigSchema = z.object({
  gameServerUrl: optionalNonEmptyString(`http://127.0.0.1:${DEV_PORTS.server}`),
  explicitGameServerUrl: optionalTrimmedString(),
  agentToken: optionalTrimmedString(),
  analysisProvider: z.preprocess(
    (val) => (typeof val === 'string' && val.trim().length > 0 ? val.trim() : 'anthropic'),
    z.enum(['anthropic', 'llama']),
  ),
  llamaBaseUrl: optionalNonEmptyString('http://127.0.0.1:8080/v1'),
  llamaModel: optionalNonEmptyString('local'),
  wsTimeoutMs: z.preprocess(
    (val) => (val === undefined || val === '' ? 15_000 : val),
    z.coerce.number().int().min(1_000).max(120_000),
  ),
});

export type McpConfig = Readonly<z.infer<typeof McpConfigSchema>>;

export function loadMcpConfig(env: Record<string, string | undefined> = process.env): McpConfig {
  const parsed = McpConfigSchema.parse({
    gameServerUrl: env.GAME_SERVER_URL,
    explicitGameServerUrl: env.GAME_SERVER_URL,
    agentToken: env.AGENT_TOKEN,
    analysisProvider: env.ANALYSIS_PROVIDER,
    llamaBaseUrl: env.LLAMA_BASE_URL,
    llamaModel: env.LLAMA_MODEL,
    wsTimeoutMs: env.MCP_WS_TIMEOUT_MS,
  });
  return Object.freeze(parsed);
}

export const mcpConfig: McpConfig = loadMcpConfig();
