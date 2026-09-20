"use strict";

const DSH_SOURCE = "dsh";
const DSH_ROOT_SOURCE_PREFIX = "dsh-root:";
const DSH_ROOT_KEY_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

function normalizeDshRootKey(value) {
  const key = String(value || "").trim().toLowerCase();
  return DSH_ROOT_KEY_RE.test(key) ? key : null;
}
function dshRootSource(key) {
  const normalized = normalizeDshRootKey(key);
  if (!normalized) throw new TypeError("Invalid DSH root key");
  return `${DSH_ROOT_SOURCE_PREFIX}${normalized}`;
}
function dshRootKeyFromSource(source) {
  const normalized = String(source || "").trim().toLowerCase();
  if (!normalized.startsWith(DSH_ROOT_SOURCE_PREFIX)) return null;
  return normalizeDshRootKey(normalized.slice(DSH_ROOT_SOURCE_PREFIX.length));
}
function isDshRootSource(source) { return dshRootKeyFromSource(source) !== null; }
function isDshSource(source) { return String(source || "").trim().toLowerCase() === DSH_SOURCE || isDshRootSource(source); }
function canonicalDshSource(source) { return isDshSource(source) ? DSH_SOURCE : String(source || "").trim().toLowerCase(); }
function dshRootLabelFromKey(key) {
  const normalized = normalizeDshRootKey(key);
  if (!normalized) return "DSH";
  const withoutHash = normalized.replace(/-[0-9a-f]{8}$/, "");
  return (withoutHash || "dsh").replace(/-/g, "_").toUpperCase();
}

module.exports = { DSH_SOURCE, DSH_ROOT_SOURCE_PREFIX, normalizeDshRootKey, dshRootSource, dshRootKeyFromSource, dshRootLabelFromKey, isDshRootSource, isDshSource, canonicalDshSource };
