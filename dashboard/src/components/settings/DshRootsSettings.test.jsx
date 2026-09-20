import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DshRootsSettings } from "./DshRootsSettings";

vi.mock("../../lib/copy", () => ({ copy: (key, params) => params?.index ? `${key} ${params.index}` : params?.error ? `${key}: ${params.error}` : key }));
vi.mock("../../ui/components", () => ({ Button: ({ children, ...props }) => React.createElement("button", props, children) }));
vi.mock("./Controls.jsx", () => ({ SectionCard: ({ title, action, children }) => React.createElement("section", null, title, action, children) }));

const root = { path: "/home/me/.dsh", origin: "configured", exists: true, has_sessions: true };

describe("DshRootsSettings", () => {
  it("adds, removes, and saves roots with accessible feedback", async () => {
    const save = vi.fn().mockResolvedValue({});
    render(<DshRootsSettings rootsState={{ roots: [root], saving: false, error: null, max_roots: 16, save }} />);
    fireEvent.click(screen.getByRole("button", { name: /settings.dsh_roots.add/ }));
    fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: "/home/me/dsh-alt" } });
    fireEvent.click(screen.getByRole("button", { name: /settings.dsh_roots.save/ }));
    await waitFor(() => expect(save).toHaveBeenCalledWith([{ path: "/home/me/.dsh" }, { path: "/home/me/dsh-alt" }]));
    expect(await screen.findByRole("status")).toHaveTextContent("settings.dsh_roots.saved");
    fireEvent.click(screen.getByRole("button", { name: "settings.dsh_roots.remove 2" }));
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("blocks duplicate roots and exposes errors", () => {
    const save = vi.fn();
    const { rerender } = render(<DshRootsSettings rootsState={{ roots: [root], saving: false, error: null, max_roots: 16, save }} />);
    fireEvent.click(screen.getByRole("button", { name: /settings.dsh_roots.add/ }));
    fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: "/home/me/.dsh/" } });
    expect(screen.getByRole("button", { name: /settings.dsh_roots.save/ })).toBeDisabled();
    expect(screen.getAllByText("settings.dsh_roots.duplicate")).toHaveLength(2);
    rerender(<DshRootsSettings rootsState={{ roots: [root], saving: false, error: new Error("write failed"), max_roots: 16, save }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("write failed");
  });
});
