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
  try {
    const { stdout } = await execa('flyctl', ['secrets', 'list', '-a', app, '--json']);
    const cleanJson = cleanJsonOutput(stdout);
    const secrets = JSON.parse(cleanJson) as FlySecret[];
    return new Set(secrets.map((s) => s.Name));
  } catch (error) {
    // Fallback: try non-JSON parsing if JSON fails
    try {
      const { stdout } = await execa('flyctl', ['secrets', 'list', '-a', app]);
      const keys = stdout
        .split('\n')
        .filter((line) => line.includes('\t') || line.includes('  '))
        .map((line) => line.split(/\s+/)[0])
        .filter((key) => key && key !== 'NAME' && !key.startsWith('DEBUG'));
      return new Set(keys);
    } catch {
      console.warn(chalk.yellow(`Could not fetch Fly secrets for ${app}: ${error}`));
      return new Set();
    }
  }
}

async function getGHSecrets(env: string): Promise<Set<string>> {
  try {
    // List environment secrets using gh CLI
    const { stdout } = await execa('gh', [
      'api',
      `/repos/:owner/:repo/environments/${env}/secrets`,
      '--jq',
      '.secrets[].name',
    ]);
    return new Set(stdout.split('\n').filter(Boolean));
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

    if (!fs.existsSync(config.envFile)) {
      console.error(chalk.red(`Error: ${config.envFile} does not exist.`));
      process.exit(1);
    }

    const envContent = fs.readFileSync(config.envFile, 'utf-8');
    const parsed = dotenv.parse(envContent);
    const keysToPush = Object.entries(parsed).filter(([key]) => {
      if (PROTECTED_KEYS.includes(key) && !options.force) {
        console.log(chalk.gray(`Skipping protected key: ${key}`));
        return false;
      }
      return parsed[key] !== 'REPLACE_ME' && parsed[key] !== '';
    });

    if (keysToPush.length === 0) {
      console.log(chalk.blue('No valid keys to push.'));
      return;
    }

    console.log(chalk.cyan(`Pushing ${keysToPush.length} secrets to ${env}...`));

    // 1. Push to Fly.io
    const flyArgs = [
      'secrets',
      'set',
      ...keysToPush.map(([k, v]) => `${k}=${v}`),
      '-a',
      config.flyApp,
    ];
    await execa('flyctl', flyArgs, { stdio: 'inherit' });
    console.log(chalk.green('✓ Successfully pushed to Fly.io'));

    // 2. Push to GitHub Environment Secrets
    for (const [key, value] of keysToPush) {
      // Use gh secret set with --env flag
      await execa('gh', ['secret', 'set', key, '--env', config.ghEnv, '--body', value], {
        stdio: 'inherit',
      });
    }
    console.log(chalk.green('✓ Successfully pushed to GitHub Environments'));
  });

program
  .command('audit')
  .description('Audit consistency between local and remote secrets')
  .argument('<environment>', 'staging or production')
  .action(async (envArg) => {
    const env = EnvironmentSchema.parse(envArg);
    const config = Config[env];

    const localKeys = fs.existsSync(config.envFile)
      ? Object.keys(dotenv.parse(fs.readFileSync(config.envFile, 'utf-8')))
      : [];

    console.log(chalk.cyan(`Auditing ${env} secrets...`));

    const [flyKeys, ghKeys] = await Promise.all([
      getFlySecrets(config.flyApp),
      getGHSecrets(config.ghEnv),
    ]);

    console.log(chalk.bold(`\nComparison for ${env}:`));

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
  });

program
  .command('remove')
  .description('Remove a secret from all remotes')
  .argument('<environment>', 'staging or production')
  .argument('<key>', 'The secret key to remove')
  .action(async (envArg, key) => {
    const env = EnvironmentSchema.parse(envArg);
    const config = Config[env];

    console.log(chalk.yellow(`Removing ${key} from ${env} remotes...`));

    // 1. Remove from Fly.io
    try {
      await execa('flyctl', ['secrets', 'unset', key, '-a', config.flyApp], { stdio: 'inherit' });
      console.log(chalk.green(`✓ Removed ${key} from Fly.io`));
    } catch {
      console.warn(chalk.gray(`Note: ${key} was not found on Fly.io or removal failed.`));
    }

    // 2. Remove from GitHub
    try {
      await execa('gh', ['secret', 'delete', key, '--env', config.ghEnv], { stdio: 'inherit' });
      console.log(chalk.green(`✓ Removed ${key} from GitHub`));
    } catch {
      console.warn(chalk.gray(`Note: ${key} was not found on GitHub or removal failed.`));
    }

    console.log(
      chalk.blue(
        `\nRemember to manually remove '${key}' from ${config.envFile} to keep local in sync.`,
      ),
    );
  });

program.parse();
