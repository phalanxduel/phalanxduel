interface IntegrityBadgeProps {
  ok: boolean;
  expected?: string;
  actual?: string;
}

export function IntegrityBadge({ ok, expected, actual }: IntegrityBadgeProps) {
  if (ok) {
    return (
      <span class="badge-ok mono" title="Integrity OK">
        ✓
      </span>
    );
  }

  const tooltip =
    expected && actual
      ? `Expected: ${expected.slice(0, 16)}…\nActual: ${actual.slice(0, 16)}…`
      : 'Integrity check failed';

  return (
    <span class="badge-fail mono" title={tooltip}>
      ✗
    </span>
  );
}
