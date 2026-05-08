import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const ASYNCAPI_PATH = path.join(ROOT, 'docs/api/asyncapi.yaml');
const SCHEMA_PATH = path.join(ROOT, 'shared/src/schema.ts');

console.log('==> 📜 Verifying WebSocket Contract Consistency...');

const asyncapiContent = fs.readFileSync(ASYNCAPI_PATH, 'utf8');
const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');

// Extraction logic (heuristic-based for speed/simplicity)
// In a real scenario, we might use a YAML parser and TS compiler API.

const serverMsgNames =
  schemaContent
    .match(/ServerMessageSchema = z\.discriminatedUnion\('type', \[([\s\S]*?)\]\)/)?.[1]
    ?.match(/([a-zA-Z]+)Schema/g)
    ?.map((n) => n.replace('Schema', '')) || [];

const clientMsgNames =
  schemaContent
    .match(/ClientMessageSchema = z\.discriminatedUnion\('type', \[([\s\S]*?)\]\)/)?.[1]
    ?.match(/([a-zA-Z]+)Schema/g)
    ?.map((n) => n.replace('Schema', '')) || [];

let failed = false;

console.log('Checking Server Messages in AsyncAPI...');
for (const name of serverMsgNames) {
  // Check if the message title exists in AsyncAPI (heuristic)
  if (!asyncapiContent.includes(`title: ${name}`)) {
    console.error(`❌ Server Message "${name}" is missing from asyncapi.yaml`);
    failed = true;
  }
}

console.log('Checking Client Messages in AsyncAPI...');
for (const name of clientMsgNames) {
  if (!asyncapiContent.includes(`title: ${name}`)) {
    console.error(`❌ Client Message "${name}" is missing from asyncapi.yaml`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('✅ WebSocket contracts are consistent.');
