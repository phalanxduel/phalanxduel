import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

const contract = read('docs/ops/production-support-contract.md');
const pipeline = read('.github/workflows/pipeline.yml');
const flyProduction = read('fly.production.toml');
const openapi = JSON.parse(read('docs/api/openapi.json')) as {
  servers?: Array<{ url?: string }>;
};
const asyncapi = read('docs/api/asyncapi.yaml');

const PRODUCTION_ORIGIN = 'https://play.phalanxduel.com';
const PRODUCTION_WS_HOST = 'play.phalanxduel.com';
const PRODUCTION_APP = 'phalanxduel-production';
const REQUIRED_IDS = Array.from(
  { length: 12 },
  (_, index) => `PD-PROD-${String(index + 1).padStart(3, '0')}`,
);
const OPTIONAL_IDS = ['PD-PROD-013'];
const RETIRED_IDS = ['PD-PROD-014', 'PD-PROD-015', 'PD-PROD-016'];

console.log('==> Verifying canonical production support contract...');

for (const [classification, ids] of [
  ['Required', REQUIRED_IDS],
  ['Optional', OPTIONAL_IDS],
  ['Retired', RETIRED_IDS],
] as const) {
  for (const id of ids) {
    assert(
      contract.includes(`| \`${id}\` | ${classification} |`),
      `Support contract must classify ${id} as ${classification}`,
    );
  }
}

for (const documentPath of [
  'docs/ops/runbook.md',
  'docs/ops/deployment-checklist.md',
  'docs/deployment.md',
  'docs/architecture/principles.md',
]) {
  assert(
    read(documentPath).includes('production-support-contract.md'),
    `${documentPath} must reference the canonical production support contract`,
  );
}

assert(contract.includes('Staging is retired'), 'Contract must explicitly retire staging');
const deploymentDocumentation = read('docs/deployment.md');
assert(
  !deploymentDocumentation.includes('remote-only'),
  'Canonical deployment documentation must not describe source deployment',
);
assert(
  !/^\s{2}deploy-staging:/mu.test(pipeline),
  'Pipeline must not contain an active deploy-staging job',
);

assert(pipeline.includes('promote-production:'), 'Pipeline must define production promotion');
assert(
  pipeline.includes('--image phalanxduel-production:latest'),
  'Production promotion must deploy the tested image',
);
assert(
  pipeline.includes('--local-only'),
  'Production promotion must use the locally tagged tested image',
);

assert(flyProduction.includes(`app = "${PRODUCTION_APP}"`), 'Fly production app identity drifted');
assert(
  flyProduction.includes('OTEL_SDK_DISABLED = "true"'),
  'Production must keep the OTel SDK disabled until the restoration contract is satisfied',
);
assert(
  !/^otel\s*=/mu.test(flyProduction),
  'Production must not declare an OTel process while the collector path is contained',
);
for (const healthPath of ['/health', '/ready']) {
  assert(
    flyProduction.includes(`path = "${healthPath}"`),
    `Fly production checks must include ${healthPath}`,
  );
}

assert(
  openapi.servers?.some(({ url }) => url === PRODUCTION_ORIGIN),
  `Generated OpenAPI must advertise ${PRODUCTION_ORIGIN}`,
);
assert(
  asyncapi.includes(`url: ${PRODUCTION_WS_HOST}`),
  `AsyncAPI must advertise ${PRODUCTION_WS_HOST}`,
);

console.log(
  `Production contract valid: ${REQUIRED_IDS.length} required subsystems, immutable image promotion, production-only deployment, OTel contained.`,
);
