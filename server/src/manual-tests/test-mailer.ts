/**
 * Test script for mailer fallback.
 */
import { sendPasswordResetEmail } from '../utils/mailer.js';

async function test() {
  console.log('Testing Mailer Fallback (LogProvider)...');
  await sendPasswordResetEmail('test@blackhole.postmarkapp.com', 'dummy-token-123');
}

test().catch(console.error);
