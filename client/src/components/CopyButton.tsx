import { useState } from 'preact/hooks';

interface CopyButtonProps {
  label: string;
  getValue: () => string;
  className?: string;
}

export function CopyButton({ label, getValue, className = 'btn btn-secondary' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(getValue());
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <button type="button" class={className} onClick={onCopy}>
      {copied ? 'Copied!' : label}
    </button>
  );
}
