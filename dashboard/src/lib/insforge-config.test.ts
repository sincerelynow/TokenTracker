import { afterEach, expect, test, vi } from "vitest";
import { getInsforgeAnonKey, getInsforgeRemoteUrl, isCloudInsforgeConfigured, loadRuntimeInsforgeConfig } from "./insforge-config";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

test("localhost cloud login prefers public CLI config and falls back for older servers", async () => {
  vi.stubEnv("VITE_INSFORGE_BASE_URL", "https://personal.example.insforge.app");
  vi.stubEnv("VITE_INSFORGE_ANON_KEY", "anon-public-test");
  expect(window.location.protocol).toBe("http:");
  expect(isCloudInsforgeConfigured()).toBe(true);

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ baseUrl: "https://runtime.example", anonKey: "runtime-public" }),
  });
  vi.stubGlobal("fetch", fetchMock);
  await loadRuntimeInsforgeConfig();
  expect(fetchMock).toHaveBeenCalledWith("/functions/tokentracker-cloud-config", expect.objectContaining({ cache: "no-store" }));
  expect(getInsforgeRemoteUrl()).toBe("https://runtime.example");
  expect(getInsforgeAnonKey()).toBe("runtime-public");
  vi.stubEnv("VITE_INSFORGE_BASE_URL", "");
  vi.stubEnv("VITE_INSFORGE_ANON_KEY", "");
  expect(isCloudInsforgeConfigured()).toBe(true);

  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ baseUrl: "", anonKey: "" }) });
  await loadRuntimeInsforgeConfig();
  expect(isCloudInsforgeConfigured()).toBe(false);

  vi.stubEnv("VITE_INSFORGE_BASE_URL", "https://personal.example.insforge.app");
  vi.stubEnv("VITE_INSFORGE_ANON_KEY", "anon-public-test");
  fetchMock.mockResolvedValue({ ok: false });
  await loadRuntimeInsforgeConfig();
  expect(getInsforgeRemoteUrl()).toBe("https://personal.example.insforge.app");
});

test("hosted dashboard uses build-time config without requesting local CLI config", async () => {
  vi.stubGlobal("window", { location: { hostname: "dashboard.example", origin: "https://dashboard.example" } });
  vi.stubEnv("VITE_INSFORGE_BASE_URL", "https://hosted.example.insforge.app");
  vi.stubEnv("VITE_INSFORGE_ANON_KEY", "hosted-public");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  await loadRuntimeInsforgeConfig();

  expect(fetchMock).not.toHaveBeenCalled();
  expect(getInsforgeRemoteUrl()).toBe("https://hosted.example.insforge.app");
  expect(getInsforgeAnonKey()).toBe("hosted-public");
  expect(isCloudInsforgeConfigured()).toBe(true);
});
