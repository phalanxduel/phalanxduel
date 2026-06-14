import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'node:crypto';

const SESSION_DIR = path.join(os.homedir(), '.local', 'state', 'phx');

export function getSessionId(): string {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const sessionFile = path.join(SESSION_DIR, 'session');

  // If session file is older than 4 hours, rotate it
  if (fs.existsSync(sessionFile)) {
    const stats = fs.statSync(sessionFile);
    const ageMs = Date.now() - stats.mtimeMs;
    if (ageMs < 4 * 60 * 60 * 1000) {
      return fs.readFileSync(sessionFile, 'utf8').trim();
    }
  }

  const sessionId = crypto.randomUUID().replace(/-/g, '');
  fs.writeFileSync(sessionFile, sessionId);
  return sessionId;
}
