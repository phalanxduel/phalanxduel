import { useState, useEffect } from 'preact/hooks';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function useApi<T>(url: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url)
      .then(async (res) => {
        if (res.status === 401) {
          window.location.hash = '#/login';
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<T>;
      })
      .then((d) => {
        if (!cancelled && d !== undefined) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url, ...deps]);

  return { data, loading, error };
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function apiPost<T>(
  url: string,
  body: unknown,
): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T;
    if (!res.ok) return { error: (data as { error?: string }).error ?? `HTTP ${res.status}` };
    return { data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function apiPatch<T>(
  url: string,
  body: unknown,
): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T;
    if (!res.ok) return { error: (data as { error?: string }).error ?? `HTTP ${res.status}` };
    return { data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
