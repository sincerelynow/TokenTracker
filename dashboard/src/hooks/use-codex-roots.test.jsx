import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCodexRoots } from "./use-codex-roots";

const api = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
const host = vi.hoisted(() => ({ local: true }));
vi.mock("../lib/codex-roots-api", () => ({
  getCodexRoots: api.get,
  updateCodexRoots: api.update,
}));
vi.mock("../lib/host-mode", () => ({ isLocalDashboardHost: () => host.local }));

describe("useCodexRoots", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.update.mockReset();
    host.local = true;
  });

  it("stays unavailable on the hosted dashboard", async () => {
    host.local = false;
    const { result } = renderHook(() => useCodexRoots());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.available).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("loads and replaces state after a save", async () => {
    api.get.mockResolvedValue({ roots: [{ path: "/a" }], configured: false, source: "default", max_roots: 16 });
    api.update.mockResolvedValue({ roots: [{ path: "/a" }, { path: "/b" }], configured: true, source: "configured", max_roots: 16 });
    const { result } = renderHook(() => useCodexRoots());
    await waitFor(() => expect(result.current.available).toBe(true));
    await act(() => result.current.save(["/a", "/b"]));
    expect(api.update).toHaveBeenCalledWith(["/a", "/b"]);
    expect(result.current.roots).toHaveLength(2);
    expect(result.current.configured).toBe(true);
    expect(result.current.saving).toBe(false);
  });
});
