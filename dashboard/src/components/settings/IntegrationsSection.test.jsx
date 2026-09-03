import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationsSection } from "./IntegrationsSection";

const sync = vi.hoisted(() => vi.fn());
vi.mock("../../lib/api", () => ({ triggerLocalSync: sync }));
vi.mock("../../lib/copy", () => ({
  copy: (key, params) => params?.error ? `${key}: ${params.error}` : params?.provider ? `${key}: ${params.provider}` : key,
}));
vi.mock("../../ui/components", () => ({
  Button: ({ children, ...props }) => React.createElement("button", props, children),
  ConfirmModal: ({ open, title, onConfirm }) => open
    ? React.createElement("div", null, title, React.createElement("button", { onClick: onConfirm }, "confirm"))
    : null,
}));
vi.mock("./Controls.jsx", () => ({
  SectionCard: ({ title, action, children }) => React.createElement("section", null, title, action, children),
  SettingsRow: ({ label, hint, control }) => React.createElement("div", null, label, hint, control),
}));

const provider = { id: "claude", label: "Claude Code", detail: "detected", detected: true, installed: false, actionable: true };

describe("IntegrationsSection", () => {
  beforeEach(() => sync.mockReset());

  it("installs a provider and confirms uninstall", async () => {
    const mutate = vi.fn().mockResolvedValue({});
    const { rerender } = render(React.createElement(IntegrationsSection, {
      integrationState: { integrations: [provider], error: null, pendingProvider: null, mutate },
    }));
    fireEvent.click(screen.getByRole("button", { name: /settings.integrations.install/ }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith("claude", "install"));

    rerender(React.createElement(IntegrationsSection, {
      integrationState: {
        integrations: [{ ...provider, installed: true }],
        error: null,
        pendingProvider: null,
        mutate,
      },
    }));
    fireEvent.click(screen.getByRole("button", { name: /settings.integrations.uninstall/ }));
    fireEvent.click(screen.getByRole("button", { name: "confirm" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith("claude", "uninstall"));
  });

  it("shows immediate statistics success and visible failure", async () => {
    let finishSync;
    sync
      .mockImplementationOnce(() => new Promise((resolve) => { finishSync = resolve; }))
      .mockRejectedValueOnce(new Error("sync broke"));
    const refresh = vi.fn().mockResolvedValue([]);
    render(React.createElement(IntegrationsSection, {
      integrationState: { integrations: [], error: null, pendingProvider: null, mutate: vi.fn(), refresh },
    }));
    const button = screen.getByRole("button", { name: /settings.integrations.sync_now/ });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    finishSync({ ok: true });
    await screen.findByText("settings.integrations.sync_success");
    expect(refresh).toHaveBeenCalledOnce();
    fireEvent.click(button);
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("sync broke");
  });
});
