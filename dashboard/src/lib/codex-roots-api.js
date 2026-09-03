import { getLocalApiAuthHeaders } from "./local-api-auth";

const CODEX_ROOTS_PATH = "/functions/tokentracker-codex-roots";

async function readPayload(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Codex roots request failed with HTTP ${response.status}`);
  }
  return payload;
}

export async function getCodexRoots({ signal } = {}) {
  const authHeaders = await getLocalApiAuthHeaders();
  const response = await fetch(CODEX_ROOTS_PATH, {
    method: "GET",
    headers: { Accept: "application/json", ...authHeaders },
    cache: "no-store",
    signal,
  });
  return readPayload(response);
}

export async function updateCodexRoots(roots, { signal } = {}) {
  const authHeaders = await getLocalApiAuthHeaders();
  const response = await fetch(CODEX_ROOTS_PATH, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ roots }),
    cache: "no-store",
    signal,
  });
  return readPayload(response);
}
