import type { ComponentChildren } from 'preact';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ComponentChildren;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T, index: number) => string;
}

export function DataTable<T>({ columns, rows, keyFn }: DataTableProps<T>) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}
              >
                No results
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={keyFn(row, index)}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
