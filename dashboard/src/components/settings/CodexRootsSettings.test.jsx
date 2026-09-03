import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CodexRootsSettings } from "./CodexRootsSettings";

vi.mock("../../lib/copy", () => ({
  copy: (key, params) => params?.index ? `${key} ${params.index}` : params?.error ? `${key}: ${params.error}` : key,
}));
vi.mock("../../ui/components", () => ({
  Button: ({ children, ...props }) => React.createElement("button", props, children),
}));
vi.mock("./Controls.jsx", () => ({
  SectionCard: ({ title, action, children }) => React.createElement("section", null, title, action, children),
}));

const root = { path: "/home/me/.codex", origin: "default", exists: true, has_sessions: true, has_archived_sessions: false };

describe("CodexRootsSettings", () => {
  it("adds, removes, and saves roots", async () => {
    const save = vi.fn().mockResolvedValue({});
    render(<CodexRootsSettings rootsState={{ roots: [root], saving: false, error: null, max_roots: 16, save }} />);
    fireEvent.click(screen.getByRole("button", { name: /settings.codex_roots.add/ }));
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[1], { target: { value: "/home/me/.codex-ipc" } });
    fireEvent.click(screen.getByRole("button", { name: /settings.codex_roots.save/ }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(["/home/me/.codex", "/home/me/.codex-ipc"]));
    await screen.findByText("settings.codex_roots.saved");

    fireEvent.click(screen.getByRole("button", { name: "settings.codex_roots.remove 2" }));
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("blocks duplicates and exposes save errors", async () => {
    const save = vi.fn().mockRejectedValue(new Error("write failed"));
    const { rerender } = render(<CodexRootsSettings rootsState={{ roots: [root], saving: false, error: null, max_roots: 16, save }} />);
    fireEvent.click(screen.getByRole("button", { name: /settings.codex_roots.add/ }));
    fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: "/home/me/.codex/" } });
    expect(screen.getByRole("button", { name: /settings.codex_roots.save/ })).toBeDisabled();
    expect(screen.getAllByText("settings.codex_roots.duplicate")).toHaveLength(2);

    rerender(<CodexRootsSettings rootsState={{ roots: [root], saving: false, error: new Error("write failed"), max_roots: 16, save }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("write failed");
  });
});
