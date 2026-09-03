import { useCallback, useEffect, useRef, useState } from "react";

interface DashboardSectionState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

/**
 * Cada widget del Dashboard llama esto por su cuenta: si su consulta falla,
 * solo ese widget muestra el error/retry, el resto de la página sigue
 * funcionando (requisito de no romper todo el Dashboard por una métrica).
 */
export function useDashboardSection<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[],
): DashboardSectionState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error cargando sección del dashboard:", err);
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => load(), [load]);

  return { data, loading, error, retry: load };
}
