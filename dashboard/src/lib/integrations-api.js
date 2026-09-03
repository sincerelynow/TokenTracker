import { getLocalApiAuthHeaders } from "./local-api-auth";

const INTEGRATIONS_PATH = "/functions/tokentracker-integrations";
export const LOCAL_USAGE_SYNCED_EVENT = "tokentracker:local-usage-synced";

export function emitLocalUsageSynced(target = window) {
  target.dispatchEvent(new Event(LOCAL_USAGE_SYNCED_EVENT));
}

export function subscribeLocalUsageSynced(refresh, { target = window, onError = () => {} } = {}) {
  const handler = () => {
    void Promise.resolve(refresh()).catch(onError);
  };
  target.addEventListener(LOCAL_USAGE_SYNCED_EVENT, handler);
  return () => target.removeEventListener(LOCAL_USAGE_SYNCED_EVENT, handler);
}

async function readPayload(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Integration request failed with HTTP ${response.status}`);
  }
  return payload;
}

export async function getIntegrations({ signal } = {}) {
  const response = await fetch(INTEGRATIONS_PATH, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });
  const payload = await readPayload(response);
  return Array.isArray(payload?.integrations) ? payload.integrations : [];
}

export async function updateIntegration(provider, action, { signal } = {}) {
  const authHeaders = await getLocalApiAuthHeaders();
  const response = await fetch(INTEGRATIONS_PATH, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ provider, action }),
    cache: "no-store",
    signal,
  });
  return readPayload(response);
}
