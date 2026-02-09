import { SCHEMA_VERSION } from '@phalanx/shared';

const appEl = document.getElementById('app');
if (appEl) {
  const info = document.createElement('p');
  info.textContent = `Schema version: ${SCHEMA_VERSION}`;
  appEl.appendChild(info);
}
