import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MenuBarSection, NativeAppFooter } from "./MenuBarSection.jsx";
import { LocaleProvider } from "../../ui/foundation/LocaleProvider.jsx";

const nativeSettingsMock = vi.hoisted(() => ({
  available: true,
  isWindows: false,
  settings: {
    toastOnReset: true,
    confettiOnReset: true,
    launchAtLogin: false,
    launchAtLoginSupported: true,
    autoUpdateEnabled: true,
    version: "1.2.3",
    platform: "macos",
  },
  setSetting: vi.fn(),
  runAction: vi.fn(),
}));

vi.mock("../../hooks/use-native-settings.js", () => ({
  useNativeSettings: () => ({
    available: nativeSettingsMock.available,
    settings: nativeSettingsMock.settings,
    setSetting: nativeSettingsMock.setSetting,
    runAction: nativeSettingsMock.runAction,
  }),
}));

vi.mock("../../lib/native-bridge.js", () => ({
  isNativeWindowsApp: () => nativeSettingsMock.isWindows,
  isNativeEmbed: () => nativeSettingsMock.available,
  setNativeSetting: vi.fn(),
}));

vi.mock("../../lib/copy", () => ({
  copy: (key) => key,
}));

function renderInRouter(ui) {
  return render(<LocaleProvider><MemoryRouter>{ui}</MemoryRouter></LocaleProvider>);
}

describe("MenuBarSection and NativeAppFooter", () => {
  beforeEach(() => {
    nativeSettingsMock.available = true;
    nativeSettingsMock.isWindows = false;
    nativeSettingsMock.settings.platform = "macos";
    nativeSettingsMock.setSetting.mockReset();
    nativeSettingsMock.runAction.mockReset();
  });

  it("shows independent toast and confetti settings", async () => {
    const user = userEvent.setup();
    renderInRouter(<MenuBarSection />);

    const toastSwitch = screen.getByRole("switch", {
      name: "settings.menubar.toastOnReset",
    });
    const confettiSwitch = screen.getByRole("switch", {
      name: "settings.menubar.confettiOnReset",
    });

    expect(toastSwitch).toHaveAttribute("aria-checked", "true");
    expect(confettiSwitch).toHaveAttribute("aria-checked", "true");

    await act(async () => {
      await user.click(toastSwitch);
      await user.click(confettiSwitch);
    });

    expect(nativeSettingsMock.setSetting).toHaveBeenCalledWith("toastOnReset", false);
    expect(nativeSettingsMock.setSetting).toHaveBeenCalledWith("confettiOnReset", false);
  });

  it.each([
    ["macOS", false],
    ["Windows", true],
  ])("hides update controls in the %s app while keeping sync", (_, isWindows) => {
    nativeSettingsMock.isWindows = isWindows;
    renderInRouter(<MenuBarSection />);

    expect(screen.queryByRole("switch", { name: "settings.menubar.autoUpdate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "settings.menubar.checkUpdates" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "settings.menubar.syncNow" })).toBeInTheDocument();
  });

  it("hides upstream footer links in native apps while keeping version information", () => {
    renderInRouter(<NativeAppFooter />);

    expect(screen.getByText("settings.menubar.updates.footerCombined")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "settings.menubar.checkUpdates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "GitHub" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "settings.footer.statusPage" })).not.toBeInTheDocument();
  });

  it("hides upstream footer links in the Windows app while keeping its version", () => {
    nativeSettingsMock.isWindows = true;
    nativeSettingsMock.settings.platform = "windows";
    renderInRouter(<NativeAppFooter />);

    expect(screen.getByText("settings.menubar.updates.footerCore")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "GitHub" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "settings.footer.statusPage" })).not.toBeInTheDocument();
  });

  it("preserves the browser footer update and status links", () => {
    nativeSettingsMock.available = false;
    renderInRouter(<NativeAppFooter />);

    expect(screen.getByRole("button", { name: "settings.menubar.checkUpdates" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "settings.footer.statusPage" })).toHaveAttribute(
      "href",
      "https://tokentracker.statuspage.io/",
    );
    expect(screen.getByText("settings.menubar.updates.footerCore")).toBeInTheDocument();
  });
});
