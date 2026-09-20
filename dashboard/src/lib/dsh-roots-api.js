import { getLocalApiAuthHeaders } from "./local-api-auth";

const DSH_ROOTS_PATH = "/functions/tokentracker-dsh-roots";
async function readPayload(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || `DSH roots request failed with HTTP ${response.status}`);
  return payload;
}
export async function getDshRoots({ signal } = {}) {
  const headers = await getLocalApiAuthHeaders();
  return readPayload(await fetch(DSH_ROOTS_PATH, { method: "GET", headers: { Accept: "application/json", ...headers }, cache: "no-store", signal }));
}
export async function updateDshRoots(roots, { signal } = {}) {
  const headers = await getLocalApiAuthHeaders();
  return readPayload(await fetch(DSH_ROOTS_PATH, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", ...headers }, body: JSON.stringify({ roots }), cache: "no-store", signal }));
}
