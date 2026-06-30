import { db } from '../src/db/index.js';
import { SeasonService } from '../src/season.js';

async function main() {
  console.log('Starting season transition...');
  try {
    const seasonService = new SeasonService();
    const result = await seasonService.startNewSeason();

    if (result.previousSeasonNumber) {
      console.log(`✅ Successfully archived Season ${result.previousSeasonNumber}`);
    } else {
      console.log('ℹ️ No active season found to archive.');
    }

    console.log(`✅ Successfully started Season ${result.newSeasonNumber}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to start new season:', error);
    process.exit(1);
  }
}

main();
