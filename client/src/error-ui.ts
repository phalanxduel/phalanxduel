import { clearError } from './state';

export function renderError(container: HTMLElement, message: string): void {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-banner';
  errorDiv.textContent = message;
  errorDiv.setAttribute('role', 'alert');
  errorDiv.setAttribute('aria-live', 'assertive');
  errorDiv.setAttribute('aria-atomic', 'true');

  const closeBtn = document.createElement('button');
  closeBtn.className = 'error-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => {
    errorDiv.remove();
    clearError();
  });
  errorDiv.appendChild(closeBtn);

  container.appendChild(errorDiv);

  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.classList.add('fade-out');
      setTimeout(() => {
        if (errorDiv.parentElement) {
          errorDiv.remove();
          clearError();
        }
      }, 500);
    }
  }, 5000);
}
