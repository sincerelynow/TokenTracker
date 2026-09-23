export function normalizeCommunityFeaturesFlag(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}

export function isCommunityFeaturesEnabled() {
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  return normalizeCommunityFeaturesFlag(env?.VITE_TOKENTRACKER_ENABLE_COMMUNITY_FEATURES);
}
