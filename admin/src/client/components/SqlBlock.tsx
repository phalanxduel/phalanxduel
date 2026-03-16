import { useRef } from 'preact/hooks';

interface SqlBlockProps {
  sql: string;
}

function highlight(sql: string): string {
  const keywords =
    /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|WITH|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|AND|OR|NOT|IN|IS|NULL|TRUE|FALSE|CREATE|TABLE|ALTER|ADD|CONSTRAINT|CHECK)\b/gi;
  const strings = /'[^']*'/g;
  const numbers = /\b\d+\b/g;

  return sql
    .replace(strings, (m) => `<span style="color:#ce9178">${m}</span>`)
    .replace(
      keywords,
      (m) => `<span style="color:#569cd6;font-weight:600">${m.toUpperCase()}</span>`,
    )
    .replace(numbers, (m) => `<span style="color:#b5cea8">${m}</span>`);
}

export function SqlBlock({ sql }: SqlBlockProps) {
  const copied = useRef(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(sql);
    copied.current = true;
    setTimeout(() => {
      copied.current = false;
    }, 1500);
  };

  // sql comes from the admin API server (trusted source, not user input)
  const highlighted = { __html: highlight(sql) };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          padding: '3px 10px',
          fontSize: '11px',
        }}
      >
        Copy
      </button>
      <pre dangerouslySetInnerHTML={highlighted} />
    </div>
  );
}
