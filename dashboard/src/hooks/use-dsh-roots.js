import { useCallback, useEffect, useState } from "react";
import { getDshRoots, updateDshRoots } from "../lib/dsh-roots-api";
import { isLocalDashboardHost } from "../lib/host-mode";
export function useDshRoots() {
  const [available, setAvailable] = useState(false), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [state, setState] = useState({ roots: [], configured: false, source: "default", max_roots: 16 }), [error, setError] = useState(null);
  const refresh = useCallback(async ({ signal } = {}) => { if (!isLocalDashboardHost()) return null; const next = await getDshRoots({ signal }); setState(next); setAvailable(true); setError(null); return next; }, []);
  useEffect(() => { if (!isLocalDashboardHost()) { setLoading(false); return undefined; } const controller = new AbortController(); refresh({ signal: controller.signal }).catch((e) => { if (e?.name !== "AbortError") { setAvailable(false); setError(e); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [refresh]);
  const save = useCallback(async (roots) => { setSaving(true); setError(null); try { const next = await updateDshRoots(roots); setState(next); setAvailable(true); return next; } catch (e) { setError(e); throw e; } finally { setSaving(false); } }, []);
  return { available, loading, saving, error, ...state, refresh, save };
}
