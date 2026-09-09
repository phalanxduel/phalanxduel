/** Local hostnames identify demo/development, including optimized builds. */
export function isLocalTelemetryHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === 'lan.phalanxduel.com' ||
    host.endsWith('.lan.phalanxduel.com')
  );
}
