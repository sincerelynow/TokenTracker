import { describe, it, expect, beforeEach } from "vitest";
import {
  emitCloudUsageSynced,
  getCloudSyncEnabled,
  getCloudUsageReady,
  getLastCloudSyncTs,
  resetCloudSyncAccountState,
  setCloudSyncAccountId,
  setStoredDeviceSession,
  setCloudSyncEnabled,
  setCloudUsageReady,
  setLastCloudSyncTs,
} from "./cloud-sync-prefs";

const KEY_ENABLED = "tokentracker_cloud_sync_enabled";

describe("getCloudSyncEnabled default", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to enabled when the preference was never set", () => {
    expect(getCloudSyncEnabled()).toBe(true);
  });

  it("respects an explicit opt-out", () => {
    localStorage.setItem(KEY_ENABLED, "0");
    expect(getCloudSyncEnabled()).toBe(false);
  });

  it("keeps an explicit opt-in", () => {
    localStorage.setItem(KEY_ENABLED, "1");
    expect(getCloudSyncEnabled()).toBe(true);
  });
});

describe("cloud usage readiness", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to not ready until the first upload completes", () => {
    expect(getCloudUsageReady()).toBe(false);
  });

  it("persists readiness when cloud upload completes", () => {
    emitCloudUsageSynced();
    expect(getCloudUsageReady()).toBe(true);
  });

  it("clears readiness when cloud sync is disabled", () => {
    setCloudUsageReady(true);
    setCloudSyncEnabled(false);
    expect(getCloudUsageReady()).toBe(false);
  });

  it("clears account-scoped session and readiness on account change", () => {
    setStoredDeviceSession({ token: "old", deviceId: "device", issuedAt: new Date().toISOString() });
    setCloudUsageReady(true);
    resetCloudSyncAccountState();
    expect(getCloudUsageReady()).toBe(false);
    expect(localStorage.getItem("tokentracker_cloud_device_id_v1")).toBeNull();
  });

  it("invalidates cloud state when the signed-in user changes", () => {
    setCloudSyncAccountId("test-user");
    setStoredDeviceSession({ token: "old", deviceId: "device", issuedAt: new Date().toISOString(), accountId: "test-user" });
    setCloudUsageReady(true);
    setLastCloudSyncTs(12345);
    setCloudSyncAccountId("formal-user");
    expect(getCloudUsageReady()).toBe(false);
    expect(getLastCloudSyncTs()).toBe(0);
    expect(localStorage.getItem("tokentracker_cloud_device_id_v1")).toBeNull();
  });
});
