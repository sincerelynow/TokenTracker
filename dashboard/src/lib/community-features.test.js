import { describe, expect, it } from "vitest";
import { normalizeCommunityFeaturesFlag } from "./community-features.js";

describe("community feature flag", () => {
  it("defaults to disabled for missing and unknown values", () => {
    expect(normalizeCommunityFeaturesFlag(undefined)).toBe(false);
    expect(normalizeCommunityFeaturesFlag("")).toBe(false);
    expect(normalizeCommunityFeaturesFlag("enabled")).toBe(false);
    expect(normalizeCommunityFeaturesFlag("false")).toBe(false);
    expect(normalizeCommunityFeaturesFlag("0")).toBe(false);
  });

  it("accepts true and one values case-insensitively", () => {
    expect(normalizeCommunityFeaturesFlag("true")).toBe(true);
    expect(normalizeCommunityFeaturesFlag(" TRUE ")).toBe(true);
    expect(normalizeCommunityFeaturesFlag("1")).toBe(true);
  });
});
