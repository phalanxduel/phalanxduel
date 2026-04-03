import { useState } from 'preact/hooks';

interface CopyButtonProps {
  label: string;
  getValue: () => string;
  className?: string;
}

export function CopyButton({ label, getValue, className = 'btn btn-secondary' }: CopyButtonProps) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  const buttonLabel =
    status === 'pending'
      ? 'Copying...'
      : status === 'success'
        ? 'Copied'
        : status === 'error'
          ? 'Copy failed'
          : label;
  const announcement =
    status === 'success'
      ? `${label} copied to clipboard.`
      : status === 'error'
        ? `Unable to copy ${label.toLowerCase()}.`
        : '';

  const onCopy = async () => {
    if (status === 'pending') return;

    try {
      setStatus('pending');
      const value = getValue().trim();
      if (!value) throw new Error('Nothing to copy');
      await navigator.clipboard.writeText(value);
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    } catch (err) {
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
      }, 2500);
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <span class="copy-button">
      <button
        type="button"
        class={`${className} copy-button__trigger copy-button__trigger--${status}`}
        aria-live="polite"
        aria-atomic="true"
        aria-busy={status === 'pending' ? 'true' : 'false'}
        onClick={() => void onCopy()}
      >
        {buttonLabel}
      </button>
      <span class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </span>
  );
}
