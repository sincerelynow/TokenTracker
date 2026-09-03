import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIntegrations } from "./use-integrations";

const api = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
const host = vi.hoisted(() => ({ local: true }));
vi.mock("../lib/integrations-api", () => ({
  getIntegrations: api.get,
  updateIntegration: api.update,
}));
vi.mock("../lib/host-mode", () => ({ isLocalDashboardHost: () => host.local }));

describe("useIntegrations", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.update.mockReset();
    host.local = true;
  });

  it("is unavailable without a local endpoint", async () => {
    host.local = false;
    const { result } = renderHook(() => useIntegrations());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.available).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("loads and updates one provider", async () => {
    api.get.mockResolvedValue([{ id: "claude", installed: false }]);
    api.update.mockResolvedValue({ integration: { id: "claude", installed: true } });
    const { result } = renderHook(() => useIntegrations());
    await waitFor(() => expect(result.current.available).toBe(true));
    await act(() => result.current.mutate("claude", "install"));
    expect(result.current.integrations[0].installed).toBe(true);
    expect(result.current.pendingProvider).toBe(null);
  });
});
