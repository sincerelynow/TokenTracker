import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSection } from "./AccountSection.jsx";

vi.mock("../../lib/copy", () => ({
  copy: (key) => ({
    "settings.section.account": "Account",
    "settings.account.publicProfile": "Public profile",
  }[key] || key),
}));

vi.mock("./useAccountProfileSettings.js", () => ({
  useAccountProfileSettings: () => ({
    enabled: true,
    signedIn: true,
    email: "user@example.com",
    userId: "user-1",
    name: { customDisplayName: "User", displayName: "User" },
    github: {},
    publicProfileOn: false,
    profileLoading: false,
    profileSaving: false,
    handlePublicProfileToggle: vi.fn(),
    signOut: vi.fn(),
    showLocalCloudSync: false,
  }),
}));

vi.mock("./Controls.jsx", () => ({
  SectionCard: ({ children, title }) => <section><h2>{title}</h2>{children}</section>,
  SettingsRow: ({ label, control }) => <div><span>{label}</span>{control}</div>,
  ToggleSwitch: ({ ariaLabel }) => <button type="button" aria-label={ariaLabel} />,
}));

vi.mock("./AccountSectionParts.jsx", () => ({
  PublicProfileFields: () => <div>Public profile fields</div>,
  SignedOutAccountSection: () => <div>Signed out</div>,
}));

describe("AccountSection community settings", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides public profile controls when community features are disabled", () => {
    vi.stubEnv("VITE_TOKENTRACKER_ENABLE_COMMUNITY_FEATURES", "false");
    render(<AccountSection />);
    expect(screen.getByRole("heading", { name: "Account" })).toBeInTheDocument();
    expect(screen.queryByText("Public profile")).not.toBeInTheDocument();
    expect(screen.queryByText("Public profile fields")).not.toBeInTheDocument();
  });
});
