import { Command } from 'commander';
import * as fs from 'fs';
import execa from 'execa';
import chalk from 'chalk';
import { z } from 'zod';

const program = new Command();

const EnvironmentSchema = z.enum(['staging', 'production']);

const Config = {
  staging: {
    flyApps: ['phalanxduel-staging', 'phalanxduel-admin-staging'],
    ghEnv: 'staging',
    envFile: '.env.staging',
  },
  production: {
    flyApps: ['phalanxduel-production', 'phalanxduel-admin'],
    ghEnv: 'production',
    envFile: '.env.production',
  },
};

const TargetSchema = z.enum(['ALL', 'RUNTIME', 'PIPELINE']);
type Target = z.infer<typeof TargetSchema>;

interface SecretMetadata {
  key: string;
  value: string;
  target: Target;
  concern: string;
  ref?: string;
  description?: string;
}

// Keys that we should NOT touch unless explicitly told to.
const PROTECTED_KEYS = ['NODE_ENV', 'APP_ENV', 'PORT', 'PHALANX_SERVER_PORT', 'PHALANX_ADMIN_PORT'];

/**
 * Custom parser to extract "Decorators" from .env file comments.
 */
function parseEnvWithMetadata(filePath: string): Record<string, SecretMetadata> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const result: Record<string, SecretMetadata> = {};

  let currentMetadata: Partial<SecretMetadata> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 1. Parse Annotations
    if (line.startsWith('# @target:')) {
      currentMetadata.target = TargetSchema.parse(line.replace('# @target:', '').trim());
      continue;
    }
    if (line.startsWith('# @concern:')) {
      currentMetadata.concern = line.replace('# @concern:', '').trim();
      continue;
    }
    if (line.startsWith('# @ref:')) {
      currentMetadata.ref = line.replace('# @ref:', '').trim();
      continue;
    }
    if (line.startsWith('# @description:')) {
      currentMetadata.description = line.replace('# @description:', '').trim();
      continue;
    }

    // 2. Parse Key-Value Pair
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts
        .join('=')
        .trim()
        .replace(/^"(.*)"$/, '$1'); // Handle quotes
      const trimmedKey = key.trim();

      result[trimmedKey] = {
        key: trimmedKey,
        value,
        target: currentMetadata.target || 'ALL',
        concern: currentMetadata.concern || 'GENERAL',
        ref: currentMetadata.ref,
        description: currentMetadata.description,
      };

      // Reset for next key
      currentMetadata = {};
    } else if (line === '' || (line.startsWith('#') && !line.includes('@'))) {
      if (line === '') currentMetadata = {};
    }
  }

  return result;
}

/**
 * Write metadata map back to .env file with decorators.
 */
function writeEnvWithMetadata(filePath: string, metadataMap: Record<string, SecretMetadata>) {
  let output = '';
  const sortedKeys = Object.keys(metadataMap).sort();

  for (const key of sortedKeys) {
    const m = metadataMap[key];
    output += `# @target: ${m.target}\n`;
    output += `# @concern: ${m.concern}\n`;
    if (m.ref) output += `# @ref: ${m.ref}\n`;
    if (m.description) output += `# @description: ${m.description}\n`;
    output += `${m.key}=${m.value}\n\n`;
  }

  fs.writeFileSync(filePath, output, 'utf-8');
}

function cleanJsonOutput(stdout: string): string {
  return stdout
    .split('\n')
    .filter((line) => line.trim().startsWith('[') || line.trim().startsWith('{'))
    .join('\n');
}

interface FlySecret {
  Name: string;
}

async function getFlySecrets(app: string): Promise<Set<string>> {
  console.log(chalk.gray(`  → Fetching metadata from Fly.io app: ${chalk.bold(app)}...`));
  try {
    const { stdout } = await execa('flyctl', ['secrets', 'list', '-a', app, '--json']);
    const cleanJson = cleanJsonOutput(stdout);
    const secrets = JSON.parse(cleanJson) as FlySecret[];
    const names = new Set(secrets.map((s) => s.Name));
    console.log(chalk.gray(`  ✓ Found ${names.size} secrets on Fly.io`));
    return names;
  } catch (error) {
    try {
      const { stdout } = await execa('flyctl', ['secrets', 'list', '-a', app]);
      const keys = stdout
        .split('\n')
        .filter((line) => line.includes('\t') || line.includes('  '))
        .map((line) => line.split(/\s+/)[0])
        .filter((key) => key && key !== 'NAME' && !key.startsWith('DEBUG'));
      const names = new Set(keys);
      console.log(chalk.gray(`  ✓ Found ${names.size} secrets on Fly.io (fallback)`));
      return names;
    } catch {
      console.warn(chalk.yellow(`Could not fetch Fly secrets for ${app}: ${error}`));
      return new Set();
    }
  }
}

async function getGHSecrets(env: string): Promise<Set<string>> {
  console.log(chalk.gray(`  → Fetching metadata from GitHub Environment: ${chalk.bold(env)}...`));
  try {
    const { stdout } = await execa('gh', [
      'api',
      `/repos/:owner/:repo/environments/${env}/secrets`,
      '--jq',
      '.secrets[].name',
    ]);
    const names = new Set(stdout.split('\n').filter(Boolean));
    console.log(chalk.gray(`  ✓ Found ${names.size} secrets on GitHub`));
    return names;
  } catch (error) {
    console.warn(chalk.yellow(`Could not fetch GitHub secrets for environment ${env}: ${error}`));
    return new Set();
  }
}

program
  .name('sync-secrets')
  .description('Synchronize secrets between local .env files, Fly.io, and GitHub Environments');

program
  .command('push')
  .description('Push local .env keys to Fly.io and GitHub based on @target')
  .argument('<environment>', 'staging or production')
  .option('--force', 'Overwrite protected keys', false)
  .action(async (envArg, options) => {
    const env = EnvironmentSchema.parse(envArg);
    const config = Config[env];

    console.log(chalk.cyan(`\n🚀 Starting DSL-powered push to ${chalk.bold(env)} environment...`));

    if (!fs.existsSync(config.envFile)) {
      console.error(chalk.red(`Error: ${config.envFile} does not exist.`));
      process.exit(1);
    }

    console.log(chalk.gray(`[1/3] Parsing DSL from local source: ${chalk.bold(config.envFile)}`));
    const metadataMap = parseEnvWithMetadata(config.envFile);
    const keys = Object.values(metadataMap);

    const keysToFly = keys.filter((m) => {
      if (m.target === 'PIPELINE') return false;
      if (PROTECTED_KEYS.includes(m.key) && !options.force) return false;
      if (m.value === 'REPLACE_ME' || m.value === '') return false;
      return true;
    });

    const keysToGH = keys.filter((m) => {
      if (m.target === 'RUNTIME') return false;
      if (PROTECTED_KEYS.includes(m.key) && !options.force) return false;
      if (m.value === 'REPLACE_ME' || m.value === '') return false;
      return true;
    });

    console.log(
      chalk.gray(
        `[2/3] Setting secrets on Fly.io apps: ${chalk.bold(config.flyApps.join(', '))}...`,
      ),
    );
    if (keysToFly.length > 0) {
      for (const app of config.flyApps) {
        console.log(chalk.gray(`      → Pushing to ${app}...`));
        const flyArgs = [
          'secrets',
          'set',
          ...keysToFly.map((m) => `${m.key}=${m.value}`),
          '-a',
          app,
        ];
        try {
          await execa('flyctl', flyArgs, { stdio: 'inherit' });
        } catch (e) {
          console.warn(chalk.yellow(`      ! Failed to push to ${app}: ${e}`));
        }
      }
    }

    console.log(
      chalk.gray(`[3/3] Setting ${keysToGH.length} secrets on GitHub (Target: PIPELINE|ALL)...`),
    );
    for (const m of keysToGH) {
      process.stdout.write(chalk.gray(`      → [${m.concern}] Pushing ${m.key}... `));
      await execa('gh', ['secret', 'set', m.key, '--env', config.ghEnv, '--body', m.value]);
      process.stdout.write(chalk.green('Done\n'));
    }

    console.log(chalk.bold.green(`\n✨ DSL Push finished successfully.\n`));
  });

program
  .command('audit')
  .description('Audit consistency between local and remote secrets with DSL metadata')
  .argument('<environment>', 'staging or production')
  .action(async (envArg) => {
    const env = EnvironmentSchema.parse(envArg);
    const config = Config[env];

    console.log(chalk.cyan(`\n🔍 DSL-powered audit for ${chalk.bold(env)} environment...`));

    console.log(chalk.gray(`[1/3] Reading DSL file: ${chalk.bold(config.envFile)}`));
    const metadataMap = fs.existsSync(config.envFile) ? parseEnvWithMetadata(config.envFile) : {};
    const localKeys = Object.keys(metadataMap);
    console.log(chalk.gray(`  ✓ Found ${localKeys.length} keys locally`));

    console.log(chalk.gray(`[2/3] Collecting remote metadata...`));
    const flySecretsMaps = await Promise.all(
      config.flyApps.map(async (app) => ({
        app,
        secrets: await getFlySecrets(app),
      })),
    );
    const ghKeys = await getGHSecrets(config.ghEnv);

    console.log(chalk.gray(`[3/3] Comparing sources...`));
    console.log(chalk.bold(`\nComparison Table for ${env.toUpperCase()}:`));
    console.log(chalk.gray('─'.repeat(120)));
    console.log(
      `${chalk.bold('KEY').padEnd(35)} ${chalk.bold('TARGET').padEnd(10)} ${chalk
        .bold('CONCERN')
        .padEnd(15)} ${chalk.bold('STATUS')}`,
    );
    console.log(chalk.gray('─'.repeat(120)));

    const allKeys = new Set([...localKeys, ...ghKeys]);
    flySecretsMaps.forEach((m) => m.secrets.forEach((k) => allKeys.add(k)));

    for (const key of Array.from(allKeys).sort()) {
      const meta = metadataMap[key];
      const inLocal = localKeys.includes(key);
      const inGH = ghKeys.has(key);

      const targetStr = meta?.target || (inLocal ? '???' : 'ORPHAN');
      const concernStr = meta?.concern || (inLocal ? '???' : 'N/A');

      const target = meta?.target || 'ALL';
      const needsFly = target === 'ALL' || target === 'RUNTIME';
      const needsGH = target === 'ALL' || target === 'PIPELINE';

      const missing = [];
      if (!inLocal) missing.push('Local');

      if (needsFly) {
        const missingApps = flySecretsMaps.filter((m) => !m.secrets.has(key)).map((m) => m.app);
        if (missingApps.length > 0) {
          missing.push(`Fly(${missingApps.join(',')})`);
        }
      }

      if (needsGH && !inGH) missing.push('GitHub');

      const statusDescription =
        missing.length > 0
          ? chalk.red(`✗ Missing in: ${missing.join(', ')}`)
          : chalk.green('✓ Synchronized');

      console.log(
        `${key.padEnd(35)} ${targetStr.padEnd(10)} ${concernStr.padEnd(15)} ${statusDescription}`,
      );
    }
    console.log(chalk.gray('─'.repeat(120)));
    console.log(chalk.cyan(`\nAudit complete.\n`));
  });

program
  .command('bootstrap')
  .description('One-time extraction of plaintext secrets from running Fly.io machines to local DSL')
  .argument('<environment>', 'staging or production')
  .action(async (envArg) => {
    const env = EnvironmentSchema.parse(envArg);
    const config = Config[env];

    console.log(chalk.cyan(`\n🔌 Bootstrapping ${chalk.bold(env)} from running machines...`));

    const extracted: Record<string, string> = {};
    const patterns = [/SENTRY_/, /VITE_/, /DATABASE_URL/, /PHALANX_/];

    for (const app of config.flyApps) {
      console.log(chalk.gray(`  → Connecting to ${chalk.bold(app)} via Fly SSH...`));
      try {
        const { stdout } = await execa('fly', ['ssh', 'console', '-a', app, '-C', 'env']);
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('=') && !line.startsWith('DEBUG')) {
            const [key, ...val] = line.split('=');
            if (patterns.some((p) => p.test(key))) {
              extracted[key.trim()] = val.join('=').trim();
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`  ! Failed to connect to ${app}: ${error}`));
      }
    }

    const count = Object.keys(extracted).length;
    if (count === 0) {
      console.warn(chalk.yellow('  ! No matching environment variables found on any machine.'));
      return;
    }

    console.log(chalk.green(`  ✓ Extracted ${count} matching variables total.`));
    console.log(chalk.gray(`  → Merging into ${chalk.bold(config.envFile)}...`));

    const currentMetadata = fs.existsSync(config.envFile)
      ? parseEnvWithMetadata(config.envFile)
      : {};

    for (const [key, value] of Object.entries(extracted)) {
      if (!currentMetadata[key]) {
        currentMetadata[key] = {
          key,
          value,
          target: key.startsWith('VITE_') || key.includes('AUTH_TOKEN') ? 'PIPELINE' : 'RUNTIME',
          concern: key.includes('ADMIN')
            ? 'ADMIN'
            : key.includes('SENTRY') || key.includes('OTLP')
              ? 'OBSERVABILITY'
              : key.includes('DATABASE')
                ? 'DATABASE'
                : 'GENERAL',
        };
      } else {
        if (currentMetadata[key].value === 'REPLACE_ME' || currentMetadata[key].value === '') {
          currentMetadata[key].value = value;
        }
      }
    }

    writeEnvWithMetadata(config.envFile, currentMetadata);
    console.log(chalk.bold.green(`\n✨ Bootstrap complete. ${config.envFile} is updated.\n`));
  });

program
  .command('prune')
  .description('Remove all orphaned secrets (those not in the local DSL file) from remotes')
  .argument('<environment>', 'staging or production')
  .option('--force', 'Execute removal without further confirmation', false)
  .action(async (envArg, options) => {
    const env = EnvironmentSchema.parse(envArg);
    const config = Config[env];

    console.log(chalk.cyan(`\n🧹 Starting prune for ${chalk.bold(env)} environment...`));

    const metadataMap = fs.existsSync(config.envFile) ? parseEnvWithMetadata(config.envFile) : {};
    const localKeys = Object.keys(metadataMap);

    const flySecretsMaps = await Promise.all(
      config.flyApps.map(async (app) => ({
        app,
        secrets: await getFlySecrets(app),
      })),
    );
    const ghKeys = await getGHSecrets(config.ghEnv);

    const orphansFly = flySecretsMaps
      .map((m) => ({
        app: m.app,
        keys: Array.from(m.secrets).filter((k) => !localKeys.includes(k)),
      }))
      .filter((m) => m.keys.length > 0);

    const orphansGH = Array.from(ghKeys).filter((k) => !localKeys.includes(k));

    if (orphansFly.length === 0 && orphansGH.length === 0) {
      console.log(chalk.green('\nNo orphans found. Your remotes are clean!'));
      return;
    }

    console.log(chalk.bold(`\nFound the following orphans to be removed:`));
    for (const m of orphansFly) {
      console.log(chalk.yellow(`  Fly.io (${m.app}):`));
      m.keys.forEach((k) => console.log(`    - ${k}`));
    }
    if (orphansGH.length > 0) {
      console.log(chalk.yellow(`  GitHub (${config.ghEnv}):`));
      orphansGH.forEach((k) => console.log(`    - ${k}`));
    }

    if (!options.force) {
      console.log(
        chalk.red(`\n⚠️  To confirm removal, run this command again with the --force flag.`),
      );
      return;
    }

    console.log(chalk.gray(`\n[1/2] Pruning Fly.io...`));
    for (const m of orphansFly) {
      for (const key of m.keys) {
        process.stdout.write(chalk.gray(`      → [${m.app}] Unsetting ${key}... `));
        try {
          await execa('flyctl', ['secrets', 'unset', key, '-a', m.app]);
          process.stdout.write(chalk.green('Done\n'));
        } catch {
          process.stdout.write(chalk.red('Failed\n'));
        }
      }
    }

    console.log(chalk.gray(`[2/2] Pruning GitHub...`));
    for (const key of orphansGH) {
      process.stdout.write(chalk.gray(`      → Deleting ${key}... `));
      try {
        await execa('gh', ['secret', 'delete', key, '--env', config.ghEnv]);
        process.stdout.write(chalk.green('Done\n'));
      } catch {
        process.stdout.write(chalk.red('Failed\n'));
      }
    }

    console.log(chalk.bold.green(`\n✨ Prune complete. Remotes are now in sync with your DSL.\n`));
  });

program
  .command('remove')
  .description('Remove a specific secret from all remotes')
  .argument('<environment>', 'staging or production')
  .argument('<key>', 'The secret key to remove')
  .action(async (envArg, key) => {
    const env = EnvironmentSchema.parse(envArg);
    const config = Config[env];
    console.log(
      chalk.yellow(`\n🗑️  Removing ${chalk.bold(key)} from ${chalk.bold(env)} remotes...`),
    );

    for (const app of config.flyApps) {
      try {
        await execa('flyctl', ['secrets', 'unset', key, '-a', app], { stdio: 'inherit' });
        console.log(chalk.green(`      ✓ Removed from Fly.io app: ${app}`));
      } catch {
        /* ignore */
      }
    }

    try {
      await execa('gh', ['secret', 'delete', key, '--env', config.ghEnv], { stdio: 'inherit' });
      console.log(chalk.green(`      ✓ Removed from GitHub`));
    } catch {
      /* ignore */
    }
    console.log(chalk.bold.green(`\nRemoval complete.\n`));
  });

program.parse();
