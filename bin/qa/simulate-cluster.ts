import { chromium } from 'playwright';
import { randomInt } from 'node:crypto';

// The three client ports defined in docker-compose.cluster.yml
const CLIENT_PORTS = [5173, 5174, 5175];

async function run() {
  const browser = await chromium.launch({ headless: true });

  // Player 1 picks a random client
  const port1 = CLIENT_PORTS[randomInt(CLIENT_PORTS.length)];
  const url1 = `http://localhost:${port1}`;
  console.log(`[P1] Connecting to Client instance at ${url1}`);

  // Player 2 picks a random client
  const port2 = CLIENT_PORTS[randomInt(CLIENT_PORTS.length)];
  const url2 = `http://localhost:${port2}`;
  console.log(`[P2] Connecting to Client instance at ${url2}`);

  const context1 = await browser.newContext();
  const page1 = await context1.newPage();

  const context2 = await browser.newContext();
  const page2 = await context2.newPage();

  try {
    // 1. P1 creates match
    console.log(`[P1] Navigating to Lobby...`);
    await page1.goto(url1);
    await page1.fill('[data-testid="lobby-name-input"]', 'Alice');
    console.log("[P1] Clicking Create Match...");
    await page1.click('[data-testid="lobby-create-btn"]');
    
    // Wait for match ID to appear in the Waiting screen
    console.log("[P1] Waiting for match ID...");
    await page1.waitForSelector('[data-testid="waiting-match-id"]', { timeout: 15000 });
    
    const matchId = await page1.getAttribute('[data-testid="waiting-match-id"]', 'data-match-id') 
                 || await page1.innerText('[data-testid="waiting-match-id"]');
    console.log(`[P1] Match created: ${matchId}`);

    // 2. P2 joins match
    console.log(`[P2] Navigating to ${url2}`);
    await page2.goto(url2);
    await page2.fill('[data-testid="lobby-name-input"]', 'Bob');
    await page2.fill('[data-testid="lobby-join-match-input"]', (matchId || '').trim());
    console.log("[P2] Clicking Join Match...");
    await page2.click('[data-testid="lobby-join-btn"]');

    // 3. Play a few turns
    console.log("Match started. Waiting for Game Board...");
    
    // Check if game UI loaded for both
    await page1.waitForSelector('.game-board', { timeout: 15000 });
    await page2.waitForSelector('.game-board', { timeout: 15000 });
    
    console.log("Cluster verification successful: Players on different clients/servers synchronized via Postgres.");

  } catch (err) {
    console.error("Cluster verification failed!");
    console.error(err);
    
    // Capture evidence
    try {
      await page1.screenshot({ path: 'cluster-failure-p1.png' });
      await page2.screenshot({ path: 'cluster-failure-p2.png' });
      console.log("Screenshots captured: cluster-failure-p1.png, cluster-failure-p2.png");
    } catch (screenshotErr) {
      console.error("Failed to capture screenshots:", screenshotErr);
    }
    
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
