import { Command } from 'commander';
import * as fs from 'fs';
import execa from 'execa';
import chalk from 'chalk';
import { z } from 'zod';

const program = new Command();

const EnvironmentSchema = z.enum(['staging', 'production']);

const Config = {
  staging: {
    flyApp: 'phalanxduel-staging',
    ghEnv: 'staging',
    envFile: '.env.staging',
  },
  production: {
    flyApp: 'phalanxduel-production',
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
const PROTECTED_KEYS = ['NODE_ENV', 'APP_ENV', 'PORT', 'PHALANX_SERVER_PORT'];

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
      chalk.gray(`[2/3] Setting ${keysToFly.length} secrets on Fly.io (Target: RUNTIME|ALL)...`),
    );
    if (keysToFly.length > 0) {
      const flyArgs = [
        'secrets',
        'set',
        ...keysToFly.map((m) => `${m.key}=${m.value}`),
        '-a',
        config.flyApp,
      ];
      await execa('flyctl', flyArgs, { stdio: 'inherit' });
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
    const flyKeys = await getFlySecrets(config.flyApp);
    const ghKeys = await getGHSecrets(config.ghEnv);

    console.log(chalk.gray(`[3/3] Comparing sources...`));
    console.log(chalk.bold(`\nComparison Table for ${env.toUpperCase()}:`));
    console.log(chalk.gray('─'.repeat(100)));
    console.log(
      `${chalk.bold('KEY').padEnd(35)} ${chalk.bold('TARGET').padEnd(10)} ${chalk
        .bold('CONCERN')
        .padEnd(15)} ${chalk.bold('STATUS')}`,
    );
    console.log(chalk.gray('─'.repeat(100)));

    const allKeys = new Set([...localKeys, ...flyKeys, ...ghKeys]);

    for (const key of Array.from(allKeys).sort()) {
      const meta = metadataMap[key];
      const inLocal = localKeys.includes(key);
      const inFly = flyKeys.has(key);
      const inGH = ghKeys.has(key);

      const targetStr = meta?.target || (inLocal ? '???' : 'ORPHAN');
      const concernStr = meta?.concern || (inLocal ? '???' : 'N/A');

      let statusDescription: string;

      const target = meta?.target || 'ALL';
      const needsFly = target === 'ALL' || target === 'RUNTIME';
      const needsGH = target === 'ALL' || target === 'PIPELINE';

      const flyOk = !needsFly || inFly;
      const ghOk = !needsGH || inGH;

      if (inLocal && flyOk && ghOk) {
        statusDescription = chalk.green('✓ Synchronized');
      } else {
        const missing = [];
        if (!inLocal) missing.push('Local');
        if (needsFly && !inFly) missing.push('Fly.io');
        if (needsGH && !inGH) missing.push('GitHub');
        statusDescription =
          missing.length > 0
            ? chalk.red(`✗ Missing in: ${missing.join(', ')}`)
            : chalk.green('✓ Synchronized');
      }

      console.log(
        `${key.padEnd(35)} ${targetStr.padEnd(10)} ${concernStr.padEnd(15)} ${statusDescription}`,
      );
    }
    console.log(chalk.gray('─'.repeat(100)));
    console.log(chalk.cyan(`\nAudit complete.\n`));
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

    const [flyKeys, ghKeys] = await Promise.all([
      getFlySecrets(config.flyApp),
      getGHSecrets(config.ghEnv),
    ]);

    const orphansFly = Array.from(flyKeys).filter((k) => !localKeys.includes(k));
    const orphansGH = Array.from(ghKeys).filter((k) => !localKeys.includes(k));

    if (orphansFly.length === 0 && orphansGH.length === 0) {
      console.log(chalk.green('\nNo orphans found. Your remotes are clean!'));
      return;
    }

    console.log(chalk.bold(`\nFound the following orphans to be removed:`));
    if (orphansFly.length > 0) {
      console.log(chalk.yellow(`  Fly.io (${config.flyApp}):`));
      orphansFly.forEach((k) => console.log(`    - ${k}`));
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
    for (const key of orphansFly) {
      process.stdout.write(chalk.gray(`      → Unsetting ${key}... `));
      try {
        await execa('flyctl', ['secrets', 'unset', key, '-a', config.flyApp]);
        process.stdout.write(chalk.green('Done\n'));
      } catch {
        process.stdout.write(chalk.red('Failed\n'));
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
    try {
      await execa('flyctl', ['secrets', 'unset', key, '-a', config.flyApp], { stdio: 'inherit' });
      console.log(chalk.green(`      ✓ Removed from Fly.io`));
    } catch {
      /* ignore */
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
