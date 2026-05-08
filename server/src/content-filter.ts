import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const BLOCKLIST_PATH = join(__dirname, '../config/blocklist.bin');
const ALGORITHM = 'aes-256-gcm';

/**
 * ContentFilterService handles the detection of prohibited terms.
 * It supports an encrypted blocklist to avoid storing offensive terms in plain text in the repo.
 */
export class ContentFilterService {
  private static instance: ContentFilterService;
  private blockedTerms = new Set<string>();
  private initialized = false;

  private constructor() {}

  public static getInstance(): ContentFilterService {
    if (!ContentFilterService.instance) {
      ContentFilterService.instance = new ContentFilterService();
    }
    return ContentFilterService.instance;
  }

  /**
   * Initializes the filter by loading the encrypted blocklist from disk.
   * If the file doesn't exist or key is missing, it falls back to basic built-in guards.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    const secret = process.env.BLOCKLIST_ENCRYPTION_KEY;
    if (!secret) {
      console.warn('BLOCKLIST_ENCRYPTION_KEY not set. Using basic built-in content filters only.');
      this.loadBuiltInGuards();
      this.initialized = true;
      return;
    }

    if (!existsSync(BLOCKLIST_PATH)) {
      console.warn(
        'Encrypted blocklist file not found. Using basic built-in content filters only.',
      );
      this.loadBuiltInGuards();
      this.initialized = true;
      return;
    }

    try {
      const encryptedData = readFileSync(BLOCKLIST_PATH);
      const decrypted = this.decrypt(encryptedData, secret);
      const terms = JSON.parse(decrypted) as string[];
      for (const term of terms) {
        this.blockedTerms.add(term.toLowerCase().trim());
      }
      this.loadBuiltInGuards(); // Always include system guards
      this.initialized = true;
      console.log(`ContentFilter initialized with ${this.blockedTerms.size} terms.`);
    } catch (err) {
      console.error('Failed to decrypt blocklist:', err);
      this.loadBuiltInGuards();
      this.initialized = true;
    }
  }

  private loadBuiltInGuards() {
    // Reserved system names that should always be blocked regardless of encryption
    const systemGuards = [
      'admin',
      'phalanx',
      'system',
      'moderator',
      'support',
      'staff',
      'official',
      'root',
      'owner',
    ];
    for (const term of systemGuards) {
      this.blockedTerms.add(term);
    }
  }

  /**
   * Checks if the content contains any blocked terms.
   * Uses simple substring matching for now.
   */
  public isFlagged(content: string): boolean {
    const normalized = content.toLowerCase();
    for (const term of this.blockedTerms) {
      if (normalized.includes(term)) return true;
    }
    return false;
  }

  /**
   * Returns the specific terms that triggered a flag.
   */
  public getViolations(content: string): string[] {
    const normalized = content.toLowerCase();
    const violations: string[] = [];
    for (const term of this.blockedTerms) {
      if (normalized.includes(term)) violations.push(term);
    }
    return violations;
  }

  private decrypt(data: Buffer, secret: string): string {
    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 32);
    const tag = data.subarray(32, 48);
    const encrypted = data.subarray(48);

    const key = scryptSync(secret, salt, 32);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  /**
   * Utility to encrypt a plain text list of terms.
   * This should be used via a maintenance script, not at runtime.
   */
  public static encryptList(terms: string[], secret: string): Buffer {
    const salt = randomBytes(16);
    const iv = randomBytes(16);
    const key = scryptSync(secret, salt, 32);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(JSON.stringify(terms), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, encrypted]);
  }
}
