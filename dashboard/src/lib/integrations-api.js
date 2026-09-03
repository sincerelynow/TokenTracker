import { getLocalApiAuthHeaders } from "./local-api-auth";

const INTEGRATIONS_PATH = "/functions/tokentracker-integrations";

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
