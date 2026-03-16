interface StatBadgeProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatBadge({ label, value, color }: StatBadgeProps) {
  return (
    <div class="stat-badge">
      <div class="value" style={color ? { color } : undefined}>
        {value}
      </div>
      <div class="label">{label}</div>
    </div>
  );
}
