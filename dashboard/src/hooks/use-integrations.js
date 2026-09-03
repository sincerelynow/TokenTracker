import { useCallback, useEffect, useState } from "react";
import { getIntegrations, updateIntegration } from "../lib/integrations-api";
import { isLocalDashboardHost } from "../lib/host-mode";

export function useIntegrations() {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState([]);
  const [error, setError] = useState(null);
  const [pendingProvider, setPendingProvider] = useState(null);

  const refresh = useCallback(async ({ signal } = {}) => {
    if (!isLocalDashboardHost()) return [];
    const next = await getIntegrations({ signal });
    setIntegrations(next);
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

  const mutate = useCallback(async (provider, action) => {
    setPendingProvider(provider);
    setError(null);
    try {
      const result = await updateIntegration(provider, action);
      setIntegrations((current) => current.map((item) => (
        item.id === provider ? result.integration : item
      )));
      return result.integration;
    } catch (nextError) {
      setError(nextError);
      throw nextError;
    } finally {
      setPendingProvider(null);
    }
  }, []);

  return { available, loading, integrations, error, pendingProvider, refresh, mutate };
}
