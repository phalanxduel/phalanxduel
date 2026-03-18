#!/usr/bin/env tsx

/**
 * Health Check Script for Phalanx Duel
 *
 * Checks both /health (liveness) and /ready (readiness) endpoints
 * for a given environment (local, staging, production).
 *
 * Usage:
 *   pnpm health:check [environment]
 *   pnpm health:check localhost:3001
 *   pnpm health:check staging
 *   pnpm health:check production
 */

import * as https from 'https';
import * as http from 'http';

interface HealthStatus {
  status: string;
  timestamp: string;
  version?: string;
  uptime_seconds?: number;
  memory_heap_used_mb?: number;
  observability?: {
    sentry_initialized: boolean;
    region?: string;
  };
}

interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
}

interface EndpointResult {
  endpoint: string;
  status: 'success' | 'error';
  statusCode?: number;
  data?: HealthStatus | ReadinessStatus;
  error?: string;
  responseTime: number;
}

interface EnvironmentConfig {
  name: string;
  url: string;
  isProduction: boolean;
}

// Environment configuration mapping
const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  local: { name: 'Local', url: 'http://localhost:3001', isProduction: false },
  localhost: { name: 'Local', url: 'http://localhost:3001', isProduction: false },
  '127.0.0.1': { name: 'Local', url: 'http://127.0.0.1:3001', isProduction: false },
  staging: { name: 'Staging', url: 'https://phalanxduel-staging.fly.dev', isProduction: false },
  production: {
    name: 'Production',
    url: 'https://phalanxduel-production.fly.dev',
    isProduction: true,
  },
};

/**
 * Fetch endpoint with timeout and error handling
 */
async function fetchEndpoint(fullUrl: string, timeout: number = 10000): Promise<EndpointResult> {
  const startTime = Date.now();
  const endpoint = fullUrl.split('?')[0]; // Remove query params from display

  return new Promise((resolve) => {
    const timeoutHandle = setTimeout(() => {
      resolve({
        endpoint,
        status: 'error',
        error: `Timeout after ${timeout}ms`,
        responseTime: Date.now() - startTime,
      });
    }, timeout);

    const makeRequest = fullUrl.startsWith('https') ? https : http;

    makeRequest
      .get(fullUrl, { rejectUnauthorized: false }, (res) => {
        clearTimeout(timeoutHandle);
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const responseTime = Date.now() - startTime;
            const parsedData = JSON.parse(data);

            resolve({
              endpoint,
              status: res.statusCode === 200 ? 'success' : 'error',
              statusCode: res.statusCode,
              data: parsedData,
              responseTime,
            });
          } catch (err) {
            resolve({
              endpoint,
              status: 'error',
              statusCode: res.statusCode,
              error: `Invalid JSON response: ${err instanceof Error ? err.message : String(err)}`,
              responseTime: Date.now() - startTime,
            });
          }
        });
      })
      .on('error', (err) => {
        clearTimeout(timeoutHandle);
        resolve({
          endpoint,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
          responseTime: Date.now() - startTime,
        });
      });
  });
}

/**
 * Format duration in seconds to human readable string
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Format memory in MB to human readable string
 */
function formatMemory(mb: number): string {
  if (mb < 1024) return `${mb}MB`;
  return `${(mb / 1024).toFixed(1)}GB`;
}

/**
 * Print formatted report
 */
function printReport(
  environment: EnvironmentConfig,
  healthResult: EndpointResult,
  readinessResult: EndpointResult,
): void {
  const timestamp = new Date().toISOString();
  const allSuccess = healthResult.status === 'success' && readinessResult.status === 'success';

  // Header
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log(`║ Health Check Report: ${environment.name.padEnd(38)} ║`);
  console.log('╠════════════════════════════════════════════════════════════════╣');

  // Environment info
  console.log(`║ URL: ${environment.url.padEnd(56)} ║`);
  console.log(`║ Checked at: ${timestamp.padEnd(50)} ║`);

  console.log('╠════════════════════════════════════════════════════════════════╣');

  // Liveness (/health) endpoint
  console.log('║ LIVENESS (/health)                                             ║');
  if (healthResult.status === 'success') {
    const health = healthResult.data as HealthStatus;
    const statusEmoji = health.status === 'ok' ? '✅' : '⚠️';
    const uptime = health.uptime_seconds
      ? ` | Uptime: ${formatDuration(health.uptime_seconds)}`
      : '';
    const memory = health.memory_heap_used_mb
      ? ` | Memory: ${formatMemory(health.memory_heap_used_mb)}`
      : '';

    console.log(
      `║   ${statusEmoji} Status: ${health.status.toUpperCase().padEnd(10)} | HTTP ${healthResult.statusCode}${uptime}${memory}`.padEnd(
        61,
      ) + '║',
    );
    if (health.version) {
      console.log(`║   Version: ${health.version.padEnd(48)} ║`);
    }
    console.log(`║   Response Time: ${healthResult.responseTime}ms${' '.repeat(42)}║`);
  } else {
    console.log(`║   ❌ ERROR: ${healthResult.error || 'Unknown error'}`.padEnd(62) + '║');
    console.log(`║   Response Time: ${healthResult.responseTime}ms${' '.repeat(42)}║`);
  }

  console.log('╠════════════════════════════════════════════════════════════════╣');

  // Readiness (/ready) endpoint
  console.log('║ READINESS (/ready)                                             ║');
  if (readinessResult.status === 'success') {
    const readiness = readinessResult.data as ReadinessStatus;
    const readyEmoji = readiness.ready ? '✅' : '❌';
    const readyStatus = readiness.ready ? 'READY' : 'NOT READY';

    console.log(
      `║   ${readyEmoji} Status: ${readyStatus.padEnd(10)} | HTTP ${readinessResult.statusCode}${' '.repeat(31)}║`,
    );
    console.log(`║   Response Time: ${readinessResult.responseTime}ms${' '.repeat(42)}║`);
  } else {
    console.log(`║   ❌ ERROR: ${readinessResult.error || 'Unknown error'}`.padEnd(62) + '║');
    console.log(`║   Response Time: ${readinessResult.responseTime}ms${' '.repeat(42)}║`);
  }

  console.log('╠════════════════════════════════════════════════════════════════╣');

  // Summary
  const overallStatus = allSuccess ? '✅ HEALTHY' : '❌ UNHEALTHY';
  console.log(`║ Overall Status: ${overallStatus.padEnd(46)} ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Exit code
  process.exit(allSuccess ? 0 : 1);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const arg = process.argv[2] || 'local';

  // Resolve environment
  let environment = ENVIRONMENTS[arg.toLowerCase()];

  // If not found, assume it's a custom URL (e.g., "localhost:8080")
  if (!environment) {
    if (arg.includes(':')) {
      const url = arg.startsWith('http') ? arg : `http://${arg}`;
      environment = {
        name: 'Custom',
        url,
        isProduction: false,
      };
    } else {
      console.error(`\n❌ Unknown environment: ${arg}`);
      console.error(
        'Valid environments: local, staging, production, or custom URL (e.g., localhost:8080)\n',
      );
      process.exit(1);
    }
  }

  console.log(`Checking health endpoints for ${environment.name}...`);

  // Fetch both endpoints in parallel
  const [healthResult, readinessResult] = await Promise.all([
    fetchEndpoint(`${environment.url}/health`),
    fetchEndpoint(`${environment.url}/ready`),
  ]);

  // Print formatted report
  printReport(environment, healthResult, readinessResult);
}

// Run
main().catch((err) => {
  console.error(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
