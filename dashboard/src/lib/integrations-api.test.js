import { afterEach, describe, expect, it, vi } from "vitest";
import { getIntegrations, updateIntegration } from "./integrations-api";

vi.mock("./local-api-auth", () => ({
  getLocalApiAuthHeaders: vi.fn(async () => ({ "x-tokentracker-local-auth": "token" })),
}));

describe("integrations API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads integration status", async () => {
    const integrations = [{ id: "claude", installed: false }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ integrations })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getIntegrations()).resolves.toEqual(integrations);
    expect(fetchMock).toHaveBeenCalledWith(
      "/functions/tokentracker-integrations",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });

  it("authenticates mutations and surfaces server errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, integration: { id: "claude" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: "failed" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await updateIntegration("claude", "install");
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ provider: "claude", action: "install" }),
      headers: expect.objectContaining({ "x-tokentracker-local-auth": "token" }),
    }));
    await expect(updateIntegration("claude", "uninstall")).rejects.toThrow("failed");
  });
});
