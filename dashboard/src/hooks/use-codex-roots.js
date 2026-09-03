import { useCallback, useEffect, useState } from "react";
import { getCodexRoots, updateCodexRoots } from "../lib/codex-roots-api";
import { isLocalDashboardHost } from "../lib/host-mode";

export function useCodexRoots() {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState({ roots: [], configured: false, source: "default", max_roots: 16 });
  const [error, setError] = useState(null);

  const refresh = useCallback(async ({ signal } = {}) => {
    if (!isLocalDashboardHost()) return null;
    const next = await getCodexRoots({ signal });
    setState(next);
    setAvailable(true);
    setError(null);
    return next;
  }, []);

  useEffect(() => {
    if (!isLocalDashboardHost()) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    refresh({ signal: controller.signal })
      .catch((nextError) => {
        if (nextError?.name !== "AbortError") {
          setAvailable(false);
          setError(nextError);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);

  const save = useCallback(async (roots) => {
    setSaving(true);
    setError(null);
    try {
      const next = await updateCodexRoots(roots);
      setState(next);
      setAvailable(true);
      return next;
    } catch (nextError) {
      setError(nextError);
      throw nextError;
    } finally {
      setSaving(false);
    }
  }, []);

  return { available, loading, saving, error, ...state, refresh, save };
}
