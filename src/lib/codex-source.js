"use strict";

const CODEX_SOURCE = "codex";
const CODEX_ROOT_SOURCE_PREFIX = "codex-root:";
const CODEX_ROOT_KEY_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

function normalizeSource(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCodexRootKey(value) {
  const key = normalizeSource(value);
  return CODEX_ROOT_KEY_RE.test(key) ? key : null;
}

function codexRootSource(key) {
  const normalized = normalizeCodexRootKey(key);
  if (!normalized) throw new TypeError("Invalid Codex root key");
  return `${CODEX_ROOT_SOURCE_PREFIX}${normalized}`;
}

function codexRootKeyFromSource(source) {
  const normalized = normalizeSource(source);
  if (!normalized.startsWith(CODEX_ROOT_SOURCE_PREFIX)) return null;
  return normalizeCodexRootKey(normalized.slice(CODEX_ROOT_SOURCE_PREFIX.length));
}

function isCodexRootSource(source) {
  return codexRootKeyFromSource(source) !== null;
}

function isCodexSource(source) {
  const normalized = normalizeSource(source);
  return normalized === CODEX_SOURCE || isCodexRootSource(normalized);
}

function canonicalUsageSource(source) {
  return isCodexSource(source) ? CODEX_SOURCE : normalizeSource(source);
}

function codexRootLabelFromKey(key) {
  const normalized = normalizeCodexRootKey(key);
  if (!normalized) return "CODEX";
  const withoutHash = normalized.replace(/-[0-9a-f]{8}$/, "");
  return (withoutHash || "codex").replace(/-/g, "_").toUpperCase();
}

module.exports = {
  CODEX_SOURCE,
  CODEX_ROOT_SOURCE_PREFIX,
  normalizeCodexRootKey,
  codexRootSource,
  codexRootKeyFromSource,
  codexRootLabelFromKey,
  isCodexRootSource,
  isCodexSource,
  canonicalUsageSource,
};
