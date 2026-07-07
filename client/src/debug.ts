/**
 * Debug utilities for the client.
 */

export function initDebugMode() {
  if (typeof window === 'undefined') return;

  // Toggle debug UI with Alt+D (Option+D on Mac)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'KeyD') {
      e.preventDefault();
      document.body.classList.toggle('debug-ui');
      console.log(
        '[debug] UI Wireframe Mode:',
        document.body.classList.contains('debug-ui') ? 'ON' : 'OFF',
      );
    }
  });
}
