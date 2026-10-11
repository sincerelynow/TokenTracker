import { getInsforgeRemoteUrl, getInsforgeAnonKey } from "./insforge-config";
import {
  clearCloudDeviceSession,
  emitCloudLeaderboardRefreshed,
  emitCloudUsageSynced,
  getCloudUsageReady,
  getCloudSyncAccountId,
  getCloudSyncEnabled,
  syncCloudSyncPrefToLocalServer,
  getCloudDeviceSessionGeneration,
  getLastCloudSyncTs,
  getStoredDeviceSession,
  setLastCloudSyncTs,
  setStoredDeviceSession,
  setCloudSyncAccountId,
  type CloudDeviceSession,
} from "./cloud-sync-prefs";
import { fetchFunctionResponse, functionUrlFor } from "./function-url";
import { getLocalApiAuthHeaders } from "./local-api-auth";
import { isCommunityFeaturesEnabled } from "./community-features.js";

const MIN_SYNC_INTERVAL_MS = 15 * 60 * 1000;
const DEVICE_TOKEN_ROTATE_AFTER_MS = 12 * 60 * 60 * 1000;
const deviceIssuanceInFlight = new Map<string, Promise<CloudDeviceSession | null>>();

function accessTokenOwner(accessToken: string): string {
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.sub === "string" && payload.sub) return payload.sub;
  } catch { /* malformed credentials cannot create an account binding */ }
  return "";
}

function isRemoteHttpBase(baseUrl: string): boolean {
  return typeof baseUrl === "string" && /^https?:\/\//i.test(baseUrl.trim());
}

function shouldRotateStoredDeviceSession(
  session: CloudDeviceSession | null,
  nowMs = Date.now(),
): boolean {
  if (!session?.localSessionId || !session?.deviceId || !session?.issuedAt) return true;
  const issuedAtMs = Date.parse(session.issuedAt);
  if (!Number.isFinite(issuedAtMs)) return true;
  return issuedAtMs + DEVICE_TOKEN_ROTATE_AFTER_MS <= nowMs;
}

async function triggerLeaderboardRefresh(
  accessToken: string,
  source: "cloud-sync-auto" | "cloud-sync-now",
): Promise<boolean> {
  const baseUrl = getInsforgeRemoteUrl();
  if (!isRemoteHttpBase(baseUrl) || !accessToken) return false;
  const root = baseUrl.replace(/\/$/, "");
  const anon = getInsforgeAnonKey();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
  if (anon) headers.apikey = anon;
  // Per-sync refresh is week-only. Month/Total scan tens of thousands of
  // hourly rows each call and burn InsForge Egress (~5 MB per full refresh
  // every 5 min per active user blew through the 5 GB plan). Server-side
  // schedules own the slower-moving month/total snapshots.
  try {
    const response = await fetchFunctionResponse(functionUrlFor(root, "tokentracker-leaderboard-refresh"), {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({ period: "week", source }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function issueDeviceTokenForCloud(accessToken: string, accountId: string): Promise<CloudDeviceSession | null> {
  const baseUrl = getInsforgeRemoteUrl();
  if (!isRemoteHttpBase(baseUrl) || !accessToken) return null;
  const authHeaders = await getLocalApiAuthHeaders();
  const res = await fetch("/functions/tokentracker-cloud-session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders, Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ expectedOwnerId: accessTokenOwner(accessToken), insforgeBaseUrl: baseUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, code: data.code, recoveryUrl: data.recovery_url });
  if (typeof data.session_id !== "string" || typeof data.device_id !== "string") return null;
  return { localSessionId: data.session_id, deviceId: data.device_id, issuedAt: data.created_at || new Date().toISOString(), baseUrl: baseUrl.replace(new RegExp("/$"), ""), accountId };
}

/**
 * 用当前本地桥会话触发 CLI sync；设备凭证只由本地服务持有。
 */
async function postLocalUsageSync(options: {
  session: CloudDeviceSession;
  insforgeBaseUrl?: string;
  accountId?: string;
  drain?: boolean;
  auto?: boolean;
  isCurrent: () => boolean;
}): Promise<{ ok?: boolean; code?: number; stdout?: string; stderr?: string } | null> {
  const { session, insforgeBaseUrl, drain } = options;
  const body: Record<string, string | boolean> = { cloudSessionId: session.localSessionId || "", expectedOwnerId: session.ownerId || "" };
  if (options.auto) body.auto = true;
  else body.recheckCloudAccess = true;
  if (drain === true) body.drain = true;
  const bu = insforgeBaseUrl || getInsforgeRemoteUrl();
  if (isRemoteHttpBase(bu)) body.insforgeBaseUrl = bu.trim();
  const authHeaders = await getLocalApiAuthHeaders();
  if (!options.isCurrent()) return null;

  const res = await fetch("/functions/tokentracker-local-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!options.isCurrent()) return null;
  if (!res.ok) {
    const msg = typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
    const deadline = Date.parse(String(data.next_allowed_at || ""));
    if (Number.isFinite(deadline)) setLastCloudSyncTs(deadline - MIN_SYNC_INTERVAL_MS);
    throw Object.assign(new Error(msg), { status: res.status, code: data.code ?? null });
  }
  return data as { ok?: boolean; code?: number; stdout?: string; stderr?: string };
}

async function resolveCloudDeviceSession(getAccessToken: () => Promise<string | null>, ownerId: string, accountId: string): Promise<CloudDeviceSession | null> {
  const accessToken = await getAccessToken();
  if (!getCloudSyncEnabled() || !accessToken || accessTokenOwner(accessToken) !== ownerId) return null;

  const target = getInsforgeRemoteUrl().replace(/\/$/, "");
  if (accountId && getCloudSyncAccountId() !== accountId) return null;
  let current = getStoredDeviceSession();
  if (current && (current.ownerId !== ownerId || current.baseUrl !== target || (current.accountId || "") !== accountId)) {
    clearCloudDeviceSession();
    current = null;
  }
  const generation = getCloudDeviceSessionGeneration();
  if (current && !shouldRotateStoredDeviceSession(current)) {
    return current;
  }

  const key = `${target}\0${ownerId}\0${accountId}\0${generation}`;
  let pending = deviceIssuanceInFlight.get(key);
  if (!pending) {
    pending = (async () => {
      const issued = await issueDeviceTokenForCloud(accessToken, accountId);
      if (!issued) return null;
      const latestAccessToken = await getAccessToken();
      if (!latestAccessToken || accessTokenOwner(latestAccessToken) !== ownerId ||
          getInsforgeRemoteUrl().replace(/\/$/, "") !== target ||
          (accountId && getCloudSyncAccountId() !== accountId)) return null;
      const owned = { ...issued, ownerId, generation };
      return setStoredDeviceSession(owned, generation) ? owned : null;
    })();
    deviceIssuanceInFlight.set(key, pending);
  }
  try {
    return await pending;
  } finally {
    if (deviceIssuanceInFlight.get(key) === pending) deviceIssuanceInFlight.delete(key);
  }
}

async function syncCloudUsageWithRecovery(
  getAccessToken: () => Promise<string | null>,
  accountId: string,
  options: { drain?: boolean; auto?: boolean } = {},
): Promise<string | null> {
  let accessToken = await getAccessToken();
  if (!getCloudSyncEnabled() || !accessToken) return null;
  // Persist opt-in before the preference-aware CLI starts; toggles are ordered.
  await syncCloudSyncPrefToLocalServer();
  if (!getCloudSyncEnabled()) return null;
  const ownerId = accessTokenOwner(accessToken);
  if (!ownerId || (accountId && accountId !== ownerId)) return null;
  if (accountId) setCloudSyncAccountId(accountId);

  let session = await resolveCloudDeviceSession(getAccessToken, ownerId, accountId);
  if (!session) return null;
  const isCurrent = () => session?.generation === getCloudDeviceSessionGeneration() &&
    getStoredDeviceSession()?.ownerId === ownerId && getCloudSyncEnabled() &&
    session?.baseUrl === getInsforgeRemoteUrl().replace(/\/$/, "") &&
    (!accountId || getCloudSyncAccountId() === accountId);
  const currentAccessToken = async () => {
    const token = await getAccessToken();
    return token && accessTokenOwner(token) === ownerId && isCurrent() ? token : null;
  };

  try {
    accessToken = await currentAccessToken();
    if (!accessToken) return null;
    const result = await postLocalUsageSync({
      session,
      auto: options.auto === true,
      insforgeBaseUrl: getInsforgeRemoteUrl(),
      drain: options.drain === true,
      isCurrent,
    });
    if (!result || !await currentAccessToken()) return null;
    const deadline = Date.parse((result as any).next_allowed_at);
    if (Number.isFinite(deadline)) setLastCloudSyncTs(deadline - MIN_SYNC_INTERVAL_MS);
    else if ((result as any).uploaded === true) setLastCloudSyncTs(Date.now());
    if ((result as any).pending !== true && (result as any).uploaded === true) {
      emitCloudUsageSynced();
      if (isCommunityFeaturesEnabled() && await triggerLeaderboardRefresh(accessToken, options.auto ? "cloud-sync-auto" : "cloud-sync-now") && await currentAccessToken()) emitCloudLeaderboardRefreshed();
    }
    return accessToken;
  } catch (error) {
    if (!await currentAccessToken()) return null;
    if (!["CLOUD_DEVICE_TOKEN_REJECTED", "auth_session_changed"].includes((error as any)?.code)) throw error;
    clearCloudDeviceSession();
    accessToken = await getAccessToken();
    if (!accessToken || accessTokenOwner(accessToken) !== ownerId) return null;
    session = await resolveCloudDeviceSession(getAccessToken, ownerId, accountId);
    if (!session) return null;
    const result = await postLocalUsageSync({
      session,
      auto: options.auto === true,
      insforgeBaseUrl: getInsforgeRemoteUrl(),
      drain: options.drain === true,
      isCurrent,
    });
    if (!result || !await currentAccessToken()) return null;
    const deadline = Date.parse((result as any).next_allowed_at);
    if (Number.isFinite(deadline)) setLastCloudSyncTs(deadline - MIN_SYNC_INTERVAL_MS);
    else if ((result as any).uploaded === true) setLastCloudSyncTs(Date.now());
    if ((result as any).pending !== true && (result as any).uploaded === true) {
      emitCloudUsageSynced();
      if (isCommunityFeaturesEnabled() && await triggerLeaderboardRefresh(accessToken, options.auto ? "cloud-sync-auto" : "cloud-sync-now") && await currentAccessToken()) emitCloudLeaderboardRefreshed();
    }
    return accessToken;
  }
}

/**
 * 若开启同步且具备条件：签发（或复用）device token 并运行本地 sync，将 queue 上传到云端。
 */
export async function runCloudUsageSyncIfDue(getAccessToken: () => Promise<string | null>, accountId = ""): Promise<void> {
  const last = getLastCloudSyncTs();
  const cloudUsageReady = getCloudUsageReady();
  if (last > 0 && Date.now() - last < MIN_SYNC_INTERVAL_MS && (!accountId || getCloudSyncAccountId() === accountId)) return;

  const accessToken = await syncCloudUsageWithRecovery(getAccessToken, accountId, {
    drain: !cloudUsageReady,
    auto: true,
  });
  if (!accessToken) return;
}

/** 用户打开「同步到云端」后立即尝试一次（忽略节流） */
export async function runCloudUsageSyncNow(getAccessToken: () => Promise<string | null>, accountId = ""): Promise<void> {
  const accessToken = await syncCloudUsageWithRecovery(getAccessToken, accountId, { drain: true });
  if (!accessToken) return;
}
