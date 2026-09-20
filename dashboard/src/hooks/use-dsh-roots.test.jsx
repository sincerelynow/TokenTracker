import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDshRoots } from "./use-dsh-roots";
const api = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
const host = vi.hoisted(() => ({ local: true }));
vi.mock("../lib/dsh-roots-api", () => ({ getDshRoots: api.get, updateDshRoots: api.update }));
vi.mock("../lib/host-mode", () => ({ isLocalDashboardHost: () => host.local }));
describe("useDshRoots", () => {
  beforeEach(() => { api.get.mockReset(); api.update.mockReset(); host.local = true; });
  it("stays unavailable on hosted dashboards", async () => {
    host.local = false;
    const { result } = renderHook(() => useDshRoots());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.available).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });
  it("loads and replaces roots after save", async () => {
    const first = { path: "/a", key: "a-12345678", label: "A" };
    const second = { path: "/b", key: "b-87654321", label: "B" };
    api.get.mockResolvedValue({ roots: [first], configured: false, source: "default", max_roots: 16 });
    api.update.mockResolvedValue({ roots: [first, second], configured: true, source: "configured", max_roots: 16 });
    const { result } = renderHook(() => useDshRoots());
    await waitFor(() => expect(result.current.available).toBe(true));
    await act(() => result.current.save([first, second]));
    expect(result.current.roots).toHaveLength(2);
    expect(result.current.configured).toBe(true);
  });
});
