import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ signedIn: true, userId: "fixture-user" }));
const client = vi.hoisted(() => ({ auth: {
  signOut: vi.fn(async () => { state.signedIn = false; }),
  signInWithPassword: vi.fn(async () => { state.signedIn = true; return { data: { user: { id: state.userId } } }; }),
  refreshSession: vi.fn(async () => ({ data: {} })),
  getCurrentUser: vi.fn(async () => ({ data: { user: state.signedIn ? { id: state.userId } : null } })),
} }));
vi.mock("../../lib/insforge-config", () => ({
  getOrCreateInsforgeClient: () => client,
  isCloudInsforgeConfigured: () => true,
}));
vi.mock("../../lib/insforge-session-recovery.mjs", () => ({
  restoreInsforgeUser: () => client.auth.getCurrentUser(),
}));
vi.mock("../../lib/api", () => ({
  invalidateAccountResponseCache: vi.fn(),
  getPublicVisibility: async () => ({}),
}));
vi.mock("../../lib/local-api-auth", () => ({
  clearLocalApiAuthToken: vi.fn(),
  getLocalApiAuthHeaders: async () => ({}),
}));

import { InsforgeAuthProvider, useInsforgeAuth } from "../InsforgeAuthContext.jsx";
import { AccountViewProvider, useAccountView } from "../AccountViewContext.jsx";
import {
  emitCloudUsageSynced, getCloudDeviceSessionGeneration, getCloudSyncAccountId,
  getCloudSyncEnabled, getCloudUsageReady, getLastCloudSyncTs, getStoredDeviceSession,
  setLastCloudSyncTs, setStoredDeviceSession, setCloudUsageReady,
} from "../../lib/cloud-sync-prefs";

describe("sign-out sync preference", () => {
  beforeEach(() => {
    localStorage.clear();
    state.signedIn = true;
    state.userId = "fixture-user";
    vi.clearAllMocks();
  });

  for (const preference of ["1", "0", null]) it(`preserves saved preference ${preference} through sign-out and re-login`, async () => {
    if (preference !== null) localStorage.setItem("tokentracker_cloud_sync_enabled", preference);
    localStorage.setItem("tokentracker_cloud_sync_changed_at_ms", "123");

    const wrapper = ({ children }) => <InsforgeAuthProvider>{children}</InsforgeAuthProvider>;
    const { result } = renderHook(() => useInsforgeAuth(), { wrapper });
    await waitFor(() => expect(result.current.signedIn).toBe(true));
    expect(getCloudSyncAccountId()).toBe("fixture-user");
    setCloudUsageReady(true);
    setLastCloudSyncTs(456);
    setStoredDeviceSession({ token: "fixture-device-token", deviceId: "device", issuedAt: "fixture", accountId: "fixture-user" });
    const issuingGeneration = getCloudDeviceSessionGeneration();
    await act(async () => result.current.signOut());
    expect(result.current.signedIn).toBe(false);
    expect(localStorage.getItem("tokentracker_cloud_sync_enabled")).toBe(preference);
    expect(localStorage.getItem("tokentracker_cloud_sync_changed_at_ms")).toBe("123");
    expect(getCloudUsageReady()).toBe(false);
    expect(getStoredDeviceSession()).toBeNull();
    expect(getCloudSyncAccountId()).toBe("");
    expect(getLastCloudSyncTs()).toBe(0);
    expect(localStorage.getItem("tokentracker_cloud_device_id_v1")).toBeNull();
    expect(setStoredDeviceSession({ token: "late-token", deviceId: "device", issuedAt: "late" }, issuingGeneration)).toBe(false);
    await act(async () => result.current.signInWithPassword({ email: "fixture@example.invalid", password: "fixture" }));
    expect(result.current.signedIn).toBe(true);
    expect(getCloudSyncAccountId()).toBe("fixture-user");
    expect(getCloudSyncEnabled()).toBe(preference === "1");
    expect(getCloudUsageReady()).toBe(false);
  });

  it("binds a different login without restoring the previous account's cloud state", async () => {
    localStorage.setItem("tokentracker_cloud_sync_enabled", "1");
    const wrapper = ({ children }) => <InsforgeAuthProvider>{children}</InsforgeAuthProvider>;
    const { result } = renderHook(() => useInsforgeAuth(), { wrapper });
    await waitFor(() => expect(result.current.signedIn).toBe(true));
    setCloudUsageReady(true);
    setLastCloudSyncTs(456);
    setStoredDeviceSession({ token: "old-token", deviceId: "old-device", issuedAt: "fixture", accountId: "fixture-user" });
    const issuingGeneration = getCloudDeviceSessionGeneration();
    await act(async () => result.current.signOut());
    state.userId = "other-user";
    await act(async () => result.current.signInWithPassword({ email: "other@example.invalid", password: "fixture" }));
    expect(getCloudSyncAccountId()).toBe("other-user");
    expect(getCloudSyncEnabled()).toBe(true);
    expect(getStoredDeviceSession()).toBeNull();
    expect(getCloudUsageReady()).toBe(false);
    expect(getLastCloudSyncTs()).toBe(0);
    expect(setStoredDeviceSession({ token: "late-token", deviceId: "old-device", issuedAt: "late" }, issuingGeneration)).toBe(false);
  });

  it("keeps signed-out localhost in the local view with sync preference enabled", async () => {
    localStorage.setItem("tokentracker_cloud_sync_enabled", "1");
    setCloudUsageReady(true);
    const wrapper = ({ children }) => <InsforgeAuthProvider><AccountViewProvider>{children}</AccountViewProvider></InsforgeAuthProvider>;
    const { result } = renderHook(() => ({ auth: useInsforgeAuth(), view: useAccountView() }), { wrapper });
    await waitFor(() => expect(result.current.auth.signedIn).toBe(true));
    act(() => emitCloudUsageSynced());
    expect(result.current.view.accountView).toBe(true);
    await act(async () => result.current.auth.signOut());
    expect(result.current.view.accountView).toBe(false);
    expect(result.current.view.resolving).toBe(false);
    expect(getCloudSyncEnabled()).toBe(true);
    await act(async () => result.current.auth.signInWithPassword({ email: "fixture@example.invalid", password: "fixture" }));
    expect(result.current.view.accountView).toBe(false);
    act(() => emitCloudUsageSynced());
    expect(result.current.view.accountView).toBe(true);
  });
});
