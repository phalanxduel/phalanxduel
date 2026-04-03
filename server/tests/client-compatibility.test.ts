import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

function readRepoFile(relativePath: string): string {
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
    const tsMatchesApi = readRepoFile('sdk/ts/client/apis/MatchesApi.ts');
    const goMatchesApi = readRepoFile('sdk/go/api_matches.go');

    expect(tsMatchesApi).toContain('apiMatchesLobbyGet');
    expect(tsMatchesApi).toContain('apiMatchesIdJoinPost');
    expect(tsMatchesApi).toContain('apiMatchesIdActionPost');

    expect(goMatchesApi).toContain('ApiMatchesLobbyGet');
    expect(goMatchesApi).toContain('ApiMatchesIdJoinPost');
    expect(goMatchesApi).toContain('ApiMatchesIdActionPost');
  });

  it('keeps reconnect and spectator WebSocket messages in the shared protocol artifacts', () => {
    const asyncapi = readRepoFile('docs/api/asyncapi.yaml');

    expect(asyncapi).toContain('title: joinMatch');
    expect(asyncapi).toContain('title: rejoinMatch');
    expect(asyncapi).toContain('title: watchMatch');
    expect(asyncapi).toContain('title: action');
  });

  it('keeps browser and Go clients aligned on the reconnect contract', () => {
    const browserLobby = readRepoFile('client/src/lobby.ts');
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
