// Debug hooks must be installed before any application components are loaded.
export {};

const hostname = window.location.hostname;
const enablePreactDebug =
  hostname === 'localhost' ||
  hostname.endsWith('.localhost') ||
  hostname === 'lan.phalanxduel.com' ||
  hostname.endsWith('.lan.phalanxduel.com');

if (enablePreactDebug) {
  await import('preact/debug');
}

await import('./main');
