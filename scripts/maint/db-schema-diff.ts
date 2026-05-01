import { execa } from 'execa';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { Command } from 'commander';

const environments = ['development', 'test', 'staging', 'production'] as const;
type Environment = (typeof environments)[number];

const config: Record<Environment, { envFile: string; defaultUrl?: string }> = {
  development: {
    envFile: '.env',
    defaultUrl: 'postgresql://localhost:5432/phalanxduel_development',
  },
  test: {
    envFile: '.env.test',
    defaultUrl: 'postgresql://localhost:5432/phalanxduel_test',
  },
  staging: {
    envFile: '.env.staging',
  },
  production: {
    envFile: '.env.production',
  },
};

function interpolate(value: string, variables: Record<string, string>): string {
  return value.replace(/\${(\w+)}/g, (_, name) => {
    return variables[name] || `\${${name}}`;
  });
}

function getDatabaseUrl(env: Environment): string | undefined {
  const envFilePath = path.join(process.cwd(), config[env].envFile);
  if (fs.existsSync(envFilePath)) {
    const content = fs.readFileSync(envFilePath, 'utf-8');
    const lines = content.split('\n');
    const vars: Record<string, string> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        vars[key.trim()] = rest.join('=').trim().replace(/^"(.*)"$/, '$1');
      }
    }
    if (vars.DATABASE_URL) {
      return interpolate(vars.DATABASE_URL, vars);
    }
  }
  return config[env].defaultUrl;
}

async function getLatestMigration(url: string): Promise<string> {
  try {
    const { stdout } = await execa('psql', [
      url,
      '-t',
      '-A',
      '-c',
      'SELECT name FROM public.schema_migrations ORDER BY name DESC LIMIT 1',
    ]);
    return stdout.trim() || 'none';
  } catch (error) {
    return 'unknown (table might not exist)';
  }
}

async function getDump(url: string): Promise<string> {
  const { stdout } = await execa('pg_dump', [
    '-s',
    '--no-owner',
    '--no-privileges',
    '--no-comments',
    url,
  ]);

  // Clean the dump to make it diff-friendly
  return stdout
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith('--')) return false;
      if (trimmed.startsWith('SET ')) return false;
      if (trimmed.startsWith('SELECT pg_catalog.set_config(\'search_path\'')) return false;
      if (trimmed.startsWith('\\restrict')) return false;
      if (trimmed.startsWith('\\unrestrict')) return false;
      if (trimmed === 'CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;') return false;
      return true;
    })
    .join('\n');
}

async function compare(env1: string, env2: string, s1: string, s2: string) {
  if (s1 === s2) {
    console.log(chalk.green(`\n✅ ${env1} and ${env2} schemas are in perfect alignment.`));
  } else {
    console.log(chalk.red(`\n❌ ${env1} and ${env2} schemas are OUT OF SYNC.`));
    
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-diff-'));
    const f1 = path.join(tmpDir, `${env1}.sql`);
    const f2 = path.join(tmpDir, `${env2}.sql`);
    
    fs.writeFileSync(f1, s1);
    fs.writeFileSync(f2, s2);
    
    try {
      const { stdout } = await execa('diff', ['-u', '--color=always', f1, f2]);
      console.log(stdout);
    } catch (error) {
      if ((error as any).stdout) {
        console.log((error as any).stdout);
      } else {
        console.log(chalk.yellow(`   Diff too large or failed to display. Use a visual diff tool on the dumps.`));
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

const program = new Command();

program
  .name('db-schema-diff')
  .description('Diff database schemas across environments')
  .option('--base <env>', 'Base environment for comparison', 'production')
  .option('--target <env>', 'Target environment for comparison')
  .option('--all', 'Compare all environments in sequence', true)
  .action(async (options) => {
    const { base, target, all } = options;

    console.log(chalk.cyan('\n📊 Database Schema Sync Report'));
    console.log(chalk.gray(`Generated at: ${new Date().toLocaleString()}\n`));

    const schemas: Record<string, string> = {};
    const migrations: Record<string, string> = {};

    for (const env of environments) {
      const url = getDatabaseUrl(env);
      if (!url) {
        console.warn(chalk.yellow(`⚠️  No connection string found for ${env}, skipping.`));
        continue;
      }

      process.stdout.write(chalk.gray(`  → Fetching metadata for ${chalk.bold(env)}... `));
      try {
        const migration = await getLatestMigration(url);
        const schema = await getDump(url);
        migrations[env] = migration;
        schemas[env] = schema;
        process.stdout.write(chalk.green('Done\n'));
      } catch (error) {
        process.stdout.write(chalk.red('Failed\n'));
        console.error(chalk.red(`    Error: ${(error as Error).message}`));
      }
    }

    console.log('\n' + chalk.bold('Environment Status:'));
    console.log(chalk.gray('─'.repeat(100)));
    console.log(
      `${chalk.bold('ENVIRONMENT').padEnd(15)} ${chalk.bold('LATEST MIGRATION').padEnd(55)} ${chalk.bold('STATUS')}`,
    );
    console.log(chalk.gray('─'.repeat(100)));

    const prodMigration = migrations['production'];

    for (const env of environments) {
      if (!migrations[env]) {
        console.log(`${env.padEnd(15)} ${chalk.gray('N/A').padEnd(55)} ${chalk.gray('Unknown')}`);
        continue;
      }
      
      const isLatest = prodMigration ? migrations[env] === prodMigration : true;
      const status = isLatest ? chalk.green('✓ Current') : chalk.yellow('Δ Out of sync');

      console.log(`${env.padEnd(15)} ${migrations[env].padEnd(55)} ${status}`);
    }
    console.log(chalk.gray('─'.repeat(100)));

    if (all) {
      console.log('\n' + chalk.bold('Sync Chain Diffs:'));
      for (let i = 0; i < environments.length - 1; i++) {
        const env1 = environments[i];
        const env2 = environments[i + 1];
        if (schemas[env1] && schemas[env2]) {
          await compare(env1, env2, schemas[env1], schemas[env2]);
        }
      }
    } else if (base && target) {
      if (schemas[base] && schemas[target]) {
        await compare(base, target, schemas[base], schemas[target]);
      } else {
        console.error(chalk.red(`Error: Missing data for ${base} or ${target}`));
      }
    }
  });

program.parse();

