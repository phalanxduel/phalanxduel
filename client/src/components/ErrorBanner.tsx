import { useEffect, useState } from 'preact/hooks';
import { clearError } from '../state';

export function ErrorBanner({ message }: { message: string }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => clearError(), 500);
    }, 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const onClose = () => {
    clearError();
  };

  return (
    <div class={`error-banner ${fading ? 'fade-out' : ''}`}>
      {message}
      <button type="button" class="error-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
