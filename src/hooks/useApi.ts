import { useCallback, useEffect, useRef, useState } from "react";

interface State<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

/**
 * Busca dados da API e refaz a busca quando `deps` mudam.
 * `refreshMs` faz atualização periódica (usado nas telas "ao vivo").
 */
export function useApi<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
  refreshMs?: number,
): State<T> & { reload: () => void } {
  const [state, setState] = useState<State<T>>({
    data: undefined,
    error: undefined,
    loading: true,
  });
  const loadRef = useRef(load);
  loadRef.current = load;
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    loadRef
      .current()
      .then((data) => !cancelled && setState({ data, error: undefined, loading: false }))
      .catch(
        (error: unknown) =>
          !cancelled &&
          setState((s) => ({
            ...s,
            error: error instanceof Error ? error : new Error(String(error)),
            loading: false,
          })),
      );
    return () => {
      cancelled = true;
    };
  }, [...deps, tick]);

  useEffect(() => {
    if (!refreshMs) return;
    const id = setInterval(reload, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, reload]);

  return { ...state, reload };
}
