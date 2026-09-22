import { afterEach, expect, test, vi } from "vitest";
import { isCloudInsforgeConfigured } from "./insforge-config";

afterEach(() => vi.unstubAllEnvs());

test("localhost proxy enables cloud login only with an explicit remote project", () => {
  vi.stubEnv("VITE_INSFORGE_BASE_URL", "https://personal.example.insforge.app");
  vi.stubEnv("VITE_INSFORGE_ANON_KEY", "anon-public-test");
  expect(window.location.protocol).toBe("http:");
  expect(isCloudInsforgeConfigured()).toBe(true);

  vi.stubEnv("VITE_INSFORGE_BASE_URL", "");
  vi.stubEnv("VITE_TOKENTRACKER_BACKEND_BASE_URL", "");
  expect(isCloudInsforgeConfigured()).toBe(false);
});
