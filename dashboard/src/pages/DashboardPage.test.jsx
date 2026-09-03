import { describe, expect, it, vi } from "vitest";
import { subscribeLocalUsageSynced } from "../lib/integrations-api";

describe("DashboardPage local usage sync event", () => {
  it("refreshes usage consumers and unsubscribes cleanly", async () => {
    const target = new EventTarget();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const unsubscribe = subscribeLocalUsageSynced(refresh, { target });

    target.dispatchEvent(new Event("tokentracker:local-usage-synced"));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());

    unsubscribe();
    target.dispatchEvent(new Event("tokentracker:local-usage-synced"));
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
