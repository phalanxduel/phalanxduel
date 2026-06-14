import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CTX_DIR = path.join(os.homedir(), '.local', 'state', 'phx');
const CTX_FILE = path.join(CTX_DIR, 'context.json');

export function getCtx(): Record<string, any> {
  if (!fs.existsSync(CTX_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CTX_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function setCtx(key: string, value: any): void {
  if (!fs.existsSync(CTX_DIR)) fs.mkdirSync(CTX_DIR, { recursive: true });
  const ctx = getCtx();
  ctx[key] = value;
  fs.writeFileSync(CTX_FILE, JSON.stringify(ctx, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const command = args[0];

  if (command === 'set') {
    const key = args[1];
    const value = args[2];
    setCtx(key, value);
    if (!isJson) console.log(`Set ${key}=${value}`);
  } else if (command === 'get') {
    const key = args[1];
    const ctx = getCtx();
    const value = key ? ctx[key] : ctx;
    if (isJson) {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(value);
    }
  } else {
    const ctx = getCtx();
    if (isJson) {
      console.log(JSON.stringify(ctx, null, 2));
    } else {
      console.log(`\n\x1b[1mPHX STICKY CONTEXT\x1b[0m`);
      console.log(`------------------`);
      for (const [k, v] of Object.entries(ctx)) {
        console.log(`  ${k}: ${v}`);
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
