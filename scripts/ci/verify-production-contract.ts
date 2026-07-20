import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

const contract = read('docs/ops/production-support-contract.md');
const deliveryPipeline = read('docs/system/delivery-pipeline.md');
const pipeline = read('.github/workflows/pipeline.yml');
const manualProduction = read('.github/workflows/manual-production-deploy.yml');
const dockerfile = read('Dockerfile');
const flyProduction = read('fly.production.toml');
const flyAdmin = read('admin/fly.toml');
const adminConfig = read('admin/src/server/config.ts');
const adminIndex = read('admin/src/server/index.ts');
const adminPackage = read('admin/package.json');
const serverApp = read('server/src/app.ts');
const openapi = JSON.parse(read('docs/api/openapi.json')) as {
  servers?: Array<{ url?: string }>;
};
const asyncapi = read('docs/api/asyncapi.yaml');

const PRODUCTION_ORIGIN = 'https://play.phalanxduel.com';
const PRODUCTION_WS_HOST = 'play.phalanxduel.com';
const PRODUCTION_APP = 'phalanxduel-production';
const ADMIN_APP = 'phalanxduel-admin';
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
assert(
  contract.includes('https://phalanxduel-admin.fly.dev'),
  'Contract must name the canonical protected admin origin',
);
const deploymentDocumentation = read('docs/deployment.md');
assert(
  !deploymentDocumentation.includes('remote-only'),
  'Canonical deployment documentation must not describe source deployment',
);
assert(
  !manualProduction.includes('remote-only'),
  'Manual production workflow must not rebuild from source',
);
assert(
  manualProduction.includes('image_ref:') && manualProduction.includes('--app phalanxduel-admin'),
  'Manual production workflow must require an image reference and deploy admin',
);
assert(
  !/^\s{2}deploy-staging:/mu.test(pipeline),
  'Pipeline must not contain an active deploy-staging job',
);
assert(
  !pipeline.includes('phalanxduel-staging'),
  'Pipeline must not retain a retired staging deployment target',
);
assert(
  deliveryPipeline.includes('Staging is retired') &&
    !deliveryPipeline.includes('Deploy to Staging'),
  'Delivery pipeline documentation must describe the production-only release path',
);

assert(pipeline.includes('promote-production:'), 'Pipeline must define production promotion');
assert(
  pipeline.includes('--image phalanxduel-production:latest'),
  'Production promotion must deploy the tested image',
);
assert(
  pipeline.includes('--image phalanxduel-admin:latest'),
  'Admin promotion must deploy the same tested image',
);
assert(
  pipeline.includes('--local-only'),
  'Production promotion must use the locally tagged tested image',
);

const patchCopyOffsets = [...dockerfile.matchAll(/^COPY patches\/ patches\/$/gmu)].map(
  ({ index }) => index,
);
const dependencyInstallOffset = dockerfile.indexOf('pnpm install --frozen-lockfile');
const productionDependenciesOffset = dockerfile.indexOf('FROM node:24-alpine AS prod-deps');
const productionInstallOffset = dockerfile.indexOf(
  'pnpm install --frozen-lockfile --prod --ignore-scripts --strict-peer-dependencies',
);
assert.equal(
  patchCopyOffsets.length,
  2,
  'Production image must copy dependency patches into both install stages',
);
assert(
  patchCopyOffsets[0] < dependencyInstallOffset,
  'Production image must copy dependency patches before the build dependency install',
);
assert(
  patchCopyOffsets[1] > productionDependenciesOffset &&
    patchCopyOffsets[1] < productionInstallOffset,
  'Production image must copy dependency patches before the production dependency install',
);

assert(flyProduction.includes(`app = "${PRODUCTION_APP}"`), 'Fly production app identity drifted');
assert(
  !/^admin\s*=/mu.test(flyProduction),
  'Game Fly app must not declare a duplicate admin process',
);
assert(flyAdmin.includes(`app = "${ADMIN_APP}"`), 'Fly admin app identity drifted');
assert(
  flyAdmin.includes('admin = "node admin/dist/server/index.js"'),
  'Fly admin app must run the compiled dedicated service',
);
assert(
  adminPackage.includes('tsc --project tsconfig.server.json'),
  'Admin build must emit the server runtime artifact',
);
assert(
  adminIndex.includes('assertAdminProductionConfig();'),
  'Admin startup must validate production configuration',
);
for (const requiredSetting of ['JWT_SECRET', 'GAME_SERVER_INTERNAL_URL']) {
  assert(
    adminConfig.includes(`requiredProductionValue('${requiredSetting}'`),
    `Admin must fail closed when ${requiredSetting} is missing`,
  );
}
assert(
  adminConfig.includes("throw new Error('ADMIN_INTERNAL_TOKEN must be set in production')"),
  'Admin must fail closed when ADMIN_INTERNAL_TOKEN is missing',
);
assert(
  !serverApp.includes('registerAdminRoutes'),
  'Game server must not register the legacy admin API',
);
assert(
  flyAdmin.includes('OTEL_SDK_DISABLED = "true"'),
  'Admin must keep the OTel SDK disabled during containment',
);
for (const healthPath of ['/health', '/ready']) {
  assert(
    flyAdmin.includes(`path = "${healthPath}"`),
    `Fly admin checks must include ${healthPath}`,
  );
}
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
