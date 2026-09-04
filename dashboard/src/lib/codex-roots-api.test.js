import { afterEach, describe, expect, it, vi } from "vitest";
import { getCodexRoots, updateCodexRoots } from "./codex-roots-api";

vi.mock("./local-api-auth", () => ({
  getLocalApiAuthHeaders: vi.fn(async () => ({ "x-tokentracker-local-auth": "token" })),
}));

describe("Codex roots API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("authenticates reads and writes", async () => {
    const root = { path: "/home/me/.codex", key: "codex-12345678", label: "CODEX" };
    const payload = { ok: true, roots: [root], configured: true };
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify(payload)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCodexRoots()).resolves.toEqual(payload);
    await expect(updateCodexRoots([root])).resolves.toEqual(payload);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({ "x-tokentracker-local-auth": "token" }),
    }));
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ roots: [root] }),
      headers: expect.objectContaining({ "x-tokentracker-local-auth": "token" }),
    }));
  });

  it("surfaces the server error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "unsafe root" }), { status: 400 }),
    ));
    await expect(updateCodexRoots(["relative"])).rejects.toThrow("unsafe root");
  });
});
