import { createClient } from "@insforge/sdk";

// Hosted dashboards use build-time config; local dashboards can use CLI config.
const PROD_INSFORGE_BASE_URL = "";
type RuntimeCloudConfig = { baseUrl: string; anonKey: string };
let runtimeCloudConfig: RuntimeCloudConfig | undefined;

function isLocalDashboard(): boolean {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname);
}

/** Read the local CLI's public cloud target before mounting the auth provider. */
export async function loadRuntimeInsforgeConfig(): Promise<void> {
  if (!isLocalDashboard()) return;
  runtimeCloudConfig = undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch("/functions/tokentracker-cloud-config", { cache: "no-store", signal: controller.signal });
    if (!response.ok) return; // Older local servers retain build-time config.
    const data = await response.json();
    const baseUrl = typeof data?.baseUrl === "string" ? data.baseUrl.trim() : "";
    const anonKey = typeof data?.anonKey === "string" ? data.anonKey.trim() : "";
    runtimeCloudConfig = {
      baseUrl: /^https:\/\//i.test(baseUrl) && anonKey ? baseUrl : "",
      anonKey: /^https:\/\//i.test(baseUrl) && anonKey ? anonKey : "",
    };
  } catch {
    // An older server or unavailable endpoint can still use build-time config.
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * InsForge 云端（SDK OAuth/Session）。`getInsforgeBaseUrl()` 在 localhost 有 env 时同样指向云端。
 * 仪表盘用量接口仍由 `getBackendBaseUrl()` 在 localhost 返回空串走本地 CLI；排行榜单独用 `getLeaderboardBaseUrl()`。
 */
/** 云端 InsForge 原始 URL（供 proxy 目标和 edge function 调用使用） */
export function getInsforgeRemoteUrl(): string {
  if (isLocalDashboard() && runtimeCloudConfig) return runtimeCloudConfig.baseUrl;
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  return (
    env?.VITE_INSFORGE_BASE_URL ||
    env?.VITE_TOKENTRACKER_BACKEND_BASE_URL ||
    PROD_INSFORGE_BASE_URL
  ).trim();
}

/**
 * SDK baseUrl：localhost 时指向自己（走 vite proxy 避免跨域 cookie 问题），
 * 部署后直接指向云端。
 */
function getInsforgeBaseUrl(): string {
  if (isLocalDashboard()) return window.location.origin;
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  return (
    env?.VITE_INSFORGE_BASE_URL ||
    env?.VITE_TOKENTRACKER_BACKEND_BASE_URL ||
    PROD_INSFORGE_BASE_URL
  ).trim();
}

export function getInsforgeAnonKey(): string {
  if (isLocalDashboard() && runtimeCloudConfig) return runtimeCloudConfig.anonKey;
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  return (
    env?.VITE_INSFORGE_ANON_KEY ||
    env?.VITE_TOKENTRACKER_BACKEND_ANON_KEY || ""
  ).trim();
}

export function isCloudInsforgeConfigured(): boolean {
  // On localhost the SDK talks through the CLI proxy (an http:// origin).
  // Validate the actual remote target instead of rejecting that proxy URL.
  const baseUrl = getInsforgeRemoteUrl();
  const anonKey = getInsforgeAnonKey();
  return /^https:\/\//i.test(baseUrl) && anonKey.length > 0;
}

/**
 * 全局单例 SDK 客户端。
 *
 * OAuth 回调时 URL 上的 `insforge_code` 只会被处理一次；若在 React 18 Strict Mode 下
 * 每次挂载都 `createClient()`，第二次实例会错过回调且会话为空，右上角头像不更新。
 */
let insforgeClientSingleton: ReturnType<typeof createClient> | null = null;

export function getOrCreateInsforgeClient(): ReturnType<typeof createClient> | null {
  if (!isCloudInsforgeConfigured()) return null;
  if (!insforgeClientSingleton) {
    insforgeClientSingleton = createClient({
      baseUrl: getInsforgeBaseUrl(),
      anonKey: getInsforgeAnonKey() || undefined,
    });
  }
  return insforgeClientSingleton;
}
