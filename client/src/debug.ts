import { el } from './renderer';

export function renderDebugButton(container: HTMLElement): void {
  const testErrorBtn = el('button', 'btn btn-tiny');
  testErrorBtn.textContent = 'Trigger Test Error';
  testErrorBtn.style.marginTop = '1rem';
  testErrorBtn.style.opacity = '0.5';
  testErrorBtn.addEventListener('click', () => {
    throw new Error('Telemetry Verification Error');
  });
  container.appendChild(testErrorBtn);
}
