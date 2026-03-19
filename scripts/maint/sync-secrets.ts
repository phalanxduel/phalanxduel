import { Command } from 'commander';
import * as dotenv from 'dotenv';
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

// Keys that we should NOT touch unless explicitly told to.
const PROTECTED_KEYS = ['NODE_ENV', 'APP_ENV', 'PORT', 'PHALANX_SERVER_PORT'];

function cleanJsonOutput(stdout: string): string {
  // Filter out Fly.io DEBUG logs and other non-JSON junk
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
    // Fallback: try non-JSON parsing if JSON fails
    try {
      const { stdout } = await execa('flyctl', ['secrets', 'list', '-a', app]);
      const keys = stdout
        .split('\n')
        .filter((line) => line.includes('\t') || line.includes('  '))
        .map((line) => line.split(/\s+/)[0])
        .filter((key) => key && key !== 'NAME' && !key.startsWith('DEBUG'));
      const names = new Set(keys);
      console.log(chalk.gray(`  ✓ Found ${names.size} secrets on Fly.io (via fallback parser)`));
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
    // List environment secrets using gh CLI
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
  .description('Push local .env keys to Fly.io and GitHub')
  .argument('<environment>', 'staging or production')
  .option('--force', 'Overwrite protected keys', false)
  .action(async (envArg, options) => {
    const env = EnvironmentSchema.parse(envArg);
    const config = Config[env];

    console.log(chalk.cyan(`\n🚀 Starting push to ${chalk.bold(env)} environment...`));

    if (!fs.existsSync(config.envFile)) {
      console.error(chalk.red(`Error: ${config.envFile} does not exist.`));
      process.exit(1);
    }

    console.log(chalk.gray(`[1/3] Loading local source: ${chalk.bold(config.envFile)}`));
    const envContent = fs.readFileSync(config.envFile, 'utf-8');
    const parsed = dotenv.parse(envContent);
    const keysToPush = Object.entries(parsed).filter(([key]) => {
      if (PROTECTED_KEYS.includes(key) && !options.force) {
        console.log(
          chalk.yellow(`      ! Skipping protected key: ${key} (use --force to override)`),
        );
        return false;
      }
      const isPlaceholder = parsed[key] === 'REPLACE_ME' || parsed[key] === '';
      if (isPlaceholder) {
        console.log(chalk.gray(`      - Skipping placeholder/empty key: ${key}`));
        return false;
      }
      return true;
    });

    if (keysToPush.length === 0) {
      console.log(chalk.blue('\nNo valid keys to push. Update your local .env file first.'));
      return;
    }

    console.log(
      chalk.gray(
        `[2/3] Setting ${keysToPush.length} secrets on Fly.io app: ${chalk.bold(config.flyApp)}...`,
      ),
    );
    // 1. Push to Fly.io
    const flyArgs = [
      'secrets',
      'set',
      ...keysToPush.map(([k, v]) => `${k}=${v}`),
      '-a',
      config.flyApp,
    ];
    await execa('flyctl', flyArgs, { stdio: 'inherit' });
    console.log(chalk.green('      ✓ Fly.io update complete'));

    console.log(
      chalk.gray(
        `[3/3] Setting ${keysToPush.length} secrets on GitHub Environment: ${chalk.bold(config.ghEnv)}...`,
      ),
    );
    // 2. Push to GitHub Environment Secrets
    for (const [key, value] of keysToPush) {
      process.stdout.write(chalk.gray(`      → Pushing ${key}... `));
      await execa('gh', ['secret', 'set', key, '--env', config.ghEnv, '--body', value]);
      process.stdout.write(chalk.green('Done\n'));
    }
    console.log(chalk.green('      ✓ GitHub Environments update complete'));

    console.log(chalk.bold.green(`\n✨ Push to ${env} finished successfully.\n`));
  });

program
  .command('audit')
  .description('Audit consistency between local and remote secrets')
  .argument('<environment>', 'staging or production')
  .action(async (envArg) => {
    const env = EnvironmentSchema.parse(envArg);
    const config = Config[env];

    console.log(chalk.cyan(`\n🔍 Auditing consistency for ${chalk.bold(env)} environment...`));

    console.log(chalk.gray(`[1/3] Reading local file: ${chalk.bold(config.envFile)}`));
    const localKeys = fs.existsSync(config.envFile)
      ? Object.keys(dotenv.parse(fs.readFileSync(config.envFile, 'utf-8')))
      : [];
    console.log(chalk.gray(`  ✓ Found ${localKeys.length} keys locally`));

    console.log(chalk.gray(`[2/3] Collecting remote metadata...`));
    // Run sequentially for predictable verbose output
    const flyKeys = await getFlySecrets(config.flyApp);
    const ghKeys = await getGHSecrets(config.ghEnv);

    console.log(chalk.gray(`[3/3] Comparing sources...`));
    console.log(chalk.bold(`\nComparison Table for ${env.toUpperCase()}:`));
    console.log(chalk.gray('─'.repeat(60)));

    const allKeys = new Set([...localKeys, ...flyKeys, ...ghKeys]);

    for (const key of Array.from(allKeys).sort()) {
      const inLocal = localKeys.includes(key);
      const inFly = flyKeys.has(key);
      const inGH = ghKeys.has(key);

      let statusDescription: string;
      if (inLocal && inFly && inGH) {
        statusDescription = chalk.green('✓ Synchronized');
      } else {
        const missing = [];
        if (!inLocal) missing.push('Local');
        if (!inFly) missing.push('Fly.io');
        if (!inGH) missing.push('GitHub');
        statusDescription = chalk.red(`✗ Missing in: ${missing.join(', ')}`);
      }

      console.log(`${key.padEnd(35)} ${statusDescription}`);
    }
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.cyan(`\nAudit complete.\n`));
  });

program
  .command('remove')
  .description('Remove a secret from all remotes')
  .argument('<environment>', 'staging or production')
  .argument('<key>', 'The secret key to remove')
  .action(async (envArg, key) => {
    const env = EnvironmentSchema.parse(envArg);
    const config = Config[env];

    console.log(
      chalk.yellow(`\n🗑️  Removing ${chalk.bold(key)} from ${chalk.bold(env)} remotes...`),
    );

    // 1. Remove from Fly.io
    console.log(chalk.gray(`[1/2] Unsetting on Fly.io app: ${chalk.bold(config.flyApp)}...`));
    try {
      await execa('flyctl', ['secrets', 'unset', key, '-a', config.flyApp], { stdio: 'inherit' });
      console.log(chalk.green(`      ✓ Removed from Fly.io`));
    } catch {
      console.warn(chalk.yellow(`      ! ${key} was not found on Fly.io or removal failed.`));
    }

    // 2. Remove from GitHub
    console.log(
      chalk.gray(`[2/2] Deleting from GitHub Environment: ${chalk.bold(config.ghEnv)}...`),
    );
    try {
      await execa('gh', ['secret', 'delete', key, '--env', config.ghEnv], { stdio: 'inherit' });
      console.log(chalk.green(`      ✓ Removed from GitHub`));
    } catch {
      console.warn(chalk.yellow(`      ! ${key} was not found on GitHub or removal failed.`));
    }

    console.log(
      chalk.blue(
        `\n💡 Note: Remember to manually remove '${key}' from ${config.envFile} to maintain local parity.`,
      ),
    );
    console.log(chalk.bold.green(`\nRemoval complete.\n`));
  });

program.parse();
