import build from 'pino-abstract-transport';

interface PinoLog {
  level: number;
  msg: string;
  [key: string]: unknown;
}

/**
 * A simple Pino transport that forwards logs to the global console object.
 * This allows our OpenTelemetry console patch in instrument.ts to capture
 * Pino logs and forward them to the OTel collector.
 */
export default async function (): Promise<unknown> {
  return build(async (source) => {
    for await (const obj of source as AsyncIterable<PinoLog>) {
      const { level, msg, ...rest } = obj;
      // Map Pino levels to console methods
      if (level >= 50) {
        console.error(`[pino] ${msg}`, rest);
      } else if (level >= 40) {
        console.warn(`[pino] ${msg}`, rest);
      } else {
        console.log(`[pino] ${msg}`, rest);
      }
    }
  });
}
