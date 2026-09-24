import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MenuBarSection, NativeAppFooter } from "./MenuBarSection.jsx";

const nativeSettingsMock = vi.hoisted(() => ({
  available: true,
  isWindows: false,
  settings: {
    toastOnReset: true,
    confettiOnReset: true,
    launchAtLogin: false,
    launchAtLoginSupported: true,
    autoUpdateEnabled: true,
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
}));

vi.mock("../../lib/copy", () => ({
  copy: (key) => key,
}));

describe("MenuBarSection limit-reset feedback", () => {
  beforeEach(() => {
    nativeSettingsMock.available = true;
    nativeSettingsMock.isWindows = false;
    nativeSettingsMock.setSetting.mockReset();
  });

  it("shows independent toast and confetti settings", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MenuBarSection />
      </MemoryRouter>,
    );

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

  it("hides update controls in the macOS app", () => {
    render(
      <MemoryRouter>
        <MenuBarSection />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("switch", { name: "settings.menubar.autoUpdate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "settings.menubar.checkUpdates" })).not.toBeInTheDocument();
  });

  it("keeps the Windows update controls", async () => {
    nativeSettingsMock.isWindows = true;
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MenuBarSection />
      </MemoryRouter>,
    );

    const autoUpdateSwitch = screen.getByRole("switch", {
      name: "settings.menubar.autoUpdate",
    });
    expect(autoUpdateSwitch).toHaveAttribute("aria-checked", "true");

    await act(async () => {
      await user.click(autoUpdateSwitch);
    });

    expect(nativeSettingsMock.setSetting).toHaveBeenCalledWith("autoUpdateEnabled", false);
    expect(
      screen.getByRole("button", { name: /settings\.menubar\.checkUpdates/ }),
    ).toBeEnabled();
  });

  it("omits the upstream update link from the dashboard footer", () => {
    nativeSettingsMock.available = false;
    render(
      <MemoryRouter>
        <NativeAppFooter />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "settings.menubar.checkUpdates" })).not.toBeInTheDocument();
  });
});
