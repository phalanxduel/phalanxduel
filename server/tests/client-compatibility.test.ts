import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

function readRepoFile(relativePath: string): string {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('Client compatibility surfaces', () => {
  it('keeps the REST bootstrap endpoints in the published OpenAPI spec', () => {
    const openapi = JSON.parse(readRepoFile('docs/api/openapi.json')) as {
      paths: Record<string, unknown>;
    };

    expect(openapi.paths).toHaveProperty('/api/matches/lobby');
    expect(openapi.paths).toHaveProperty('/api/matches/{id}/join');
    expect(openapi.paths).toHaveProperty('/api/matches/{id}/action');
  });

  it('exposes REST bootstrap endpoints in the generated TypeScript and Go SDKs', () => {
    const tsPath = resolve(root, 'sdk/ts/client/apis/MatchesApi.ts');
    const goPath = resolve(root, 'sdk/go/api_matches.go');

    // Skip if SDKs aren't generated (e.g. in CI test job where Java is missing)
    try {
      const tsMatchesApi = readFileSync(tsPath, 'utf8');
      const goMatchesApi = readFileSync(goPath, 'utf8');

      expect(tsMatchesApi).toContain('apiMatchesLobbyGet');
      expect(tsMatchesApi).toContain('apiMatchesIdJoinPost');
      expect(tsMatchesApi).toContain('apiMatchesIdActionPost');

      expect(goMatchesApi).toContain('ApiMatchesLobbyGet');
      expect(goMatchesApi).toContain('ApiMatchesIdJoinPost');
      expect(goMatchesApi).toContain('ApiMatchesIdActionPost');
    } catch (err) {
      if ((err as { code?: string }).code === 'ENOENT') {
        console.warn('⏭️  Skipping SDK compatibility test (generated files not found)');
        return;
      }
      throw err;
    }
  });

  it('keeps reconnect and spectator WebSocket messages in the shared protocol artifacts', () => {
    const asyncapi = readRepoFile('docs/api/asyncapi.yaml');

    expect(asyncapi).toContain('title: joinMatch');
    expect(asyncapi).toContain('title: rejoinMatch');
    expect(asyncapi).toContain('title: watchMatch');
    expect(asyncapi).toContain('title: action');
  });

  it('keeps browser and Go clients aligned on the reconnect contract', () => {
    const browserLobby = readRepoFile('client/src/lobby.tsx');
    const browserConnection = readRepoFile('client/src/connection.ts');
    const goWsClient = readRepoFile('clients/go/duel-cli/ws_client.go');

    expect(browserLobby).toContain("type: 'joinMatch'");
    expect(browserLobby).toContain("type: 'watchMatch'");
    expect(browserConnection).toContain("type: 'rejoinMatch'");
    expect(browserConnection).toContain("type: 'authenticate'");

    expect(goWsClient).toContain('Type:       "joinMatch"');
    expect(goWsClient).toContain('Type:     "rejoinMatch"');
    expect(goWsClient).toContain('pendingPayloadsLocked("rejoinMatch", "joinMatch")');
  });
});
