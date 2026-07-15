import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic data-fetching hook.
 *
 * @param {Function} apiFn  – An async function that returns data (e.g. api.getMarketStatus).
 * @param  {...any}  args   – Arguments forwarded to apiFn.
 * @returns {{ data: any, loading: boolean, error: string|null, refetch: Function }}
 */
export function useApi(apiFn, ...args) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Serialize args so the effect only re-runs when values actually change,
  // avoiding infinite loops from new array references on every render.
  const argsKey = JSON.stringify(args);
  const argsRef = useRef(args);
  argsRef.current = args;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn(...argsRef.current);
      setData(result);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFn, argsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
