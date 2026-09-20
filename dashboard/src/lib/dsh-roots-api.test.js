import { afterEach, describe, expect, it, vi } from "vitest";
import { getDshRoots, updateDshRoots } from "./dsh-roots-api";
vi.mock("./local-api-auth", () => ({ getLocalApiAuthHeaders: vi.fn(async () => ({ "x-tokentracker-local-auth": "token" })) }));
describe("DSH roots API", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("authenticates reads and writes", async () => {
    const root = { path: "/home/me/.dsh", key: "dsh-12345678", label: "DSH" };
    const payload = { ok: true, roots: [root], configured: true };
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify(payload)));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getDshRoots()).resolves.toEqual(payload);
    await expect(updateDshRoots([root])).resolves.toEqual(payload);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: "GET", headers: expect.objectContaining({ "x-tokentracker-local-auth": "token" }) }));
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "POST", body: JSON.stringify({ roots: [root] }) }));
  });
  it("surfaces server errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: "unsafe root" }), { status: 400 })));
    await expect(updateDshRoots(["relative"])).rejects.toThrow("unsafe root");
  });
});
