"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const os = require("node:os");
const path = require("node:path");

const { writeFileAtomic, chmod600IfPossible } = require("./fs");
const wsl = require("./wsl-probe");
const { resolveInstallPaths } = require("./install-resolver");
const { normalizeDshRootKey, dshRootSource, dshRootLabelFromKey } = require("./dsh-source");

const MAX_DSH_ROOTS = 16;

class DshRootsError extends Error {
  constructor(message, code = "DSH_ROOTS_INVALID") {
    super(message);
    this.name = "DshRootsError";
    this.code = code;
  }
}

function configPathFor({ home = os.homedir(), trackerDir } = {}) {
  return path.join(trackerDir || path.join(home, ".tokentracker", "tracker"), "config.json");
}

function readConfig(configPath) {
  try {
    const value = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw new DshRootsError(`Unable to read TokenTracker config: ${error.message}`, "DSH_ROOTS_CONFIG_INVALID");
  }
}

function expandHome(input, home, platform = process.platform) {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) throw new DshRootsError("DSH root must not be empty");
  if (value === "~") return path.resolve(home);
  if (value.startsWith("~/") || value.startsWith("~\\")) return path.resolve(home, value.slice(2));
  if (platform === "win32" && path.win32.isAbsolute(value)) return value;
  return path.resolve(value);
}

function identityFor(root, platform = process.platform) {
  let identity = root;
  try { identity = fs.realpathSync.native(root); } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  identity = platform === "win32" ? path.win32.normalize(identity) : path.normalize(identity);
  return platform === "win32" ? identity.toLowerCase() : identity;
}

function validateRoot(input, { home = os.homedir(), platform = process.platform, requireExistingParent = true } = {}) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) throw new DshRootsError("DSH root must not be empty");
  const pathApi = platform === "win32" ? path.win32 : path;
  if (raw !== "~" && !raw.startsWith("~/") && !raw.startsWith("~\\") && !pathApi.isAbsolute(raw)) {
    throw new DshRootsError(`DSH root must be an absolute path: ${raw}`);
  }
  const root = expandHome(raw, home, platform);
  if (pathApi.parse(root).root === root) throw new DshRootsError(`DSH root must not be a filesystem root: ${raw}`);
  try {
    const stat = fs.statSync(root);
    if (!stat.isDirectory()) throw new DshRootsError(`DSH root is not a directory: ${raw}`);
  } catch (error) {
    if (error instanceof DshRootsError) throw error;
    if (error?.code !== "ENOENT") throw new DshRootsError(`Unable to inspect DSH root ${raw}: ${error.message}`);
    if (!requireExistingParent) return { path: root, identity: identityFor(root, platform) };
    try {
      if (!fs.statSync(pathApi.dirname(root)).isDirectory()) throw new Error("not a directory");
    } catch {
      throw new DshRootsError(`DSH root parent does not exist: ${raw}`);
    }
  }
  return { path: root, identity: identityFor(root, platform) };
}

function normalizeConfiguredRoots(inputs, options = {}) {
  if (!Array.isArray(inputs)) throw new DshRootsError("roots must be an array");
  const roots = [];
  const identities = new Set();
  for (const input of inputs) {
    const normalized = validateRoot(typeof input === "string" ? input : input?.path, options);
    if (identities.has(normalized.identity)) continue;
    identities.add(normalized.identity);
    roots.push(normalized.path);
  }
  if (roots.length === 0) throw new DshRootsError("At least one DSH root is required");
  if (roots.length > MAX_DSH_ROOTS) throw new DshRootsError(`At most ${MAX_DSH_ROOTS} DSH roots are allowed`, "DSH_ROOTS_LIMIT");
  return roots;
}

function derivedRootKey(root, identity) {
  const base = path.basename(root).replace(/^\.+/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "dsh";
  const digest = crypto.createHash("sha256").update(identity).digest("hex").slice(0, 8);
  return `${base.slice(0, 53)}-${digest}`;
}

function normalizeRootRecords(inputs, options = {}) {
  const home = options.home || os.homedir();
  const platform = options.platform || process.platform;
  const paths = normalizeConfiguredRoots(inputs, { ...options, home, platform });
  const records = [];
  const usedKeys = new Set();
  for (const root of paths) {
    const identity = identityFor(root, platform);
    const original = inputs.find((input) => {
      try { return identityFor(expandHome(typeof input === "string" ? input : input?.path, home, platform), platform) === identity; } catch { return false; }
    });
    let key = normalizeDshRootKey(typeof original === "object" ? original?.key : null) || derivedRootKey(root, identity);
    if (usedKeys.has(key)) key = derivedRootKey(root, `${identity}:${records.length}`);
    usedKeys.add(key);
    const label = typeof original === "object" && typeof original?.label === "string" && original.label.trim()
      ? original.label.trim().slice(0, 64)
      : dshRootLabelFromKey(key);
    records.push({ path: root, key, label });
  }
  return records;
}

function probeRoot(root, origin, metadata = {}) {
  let isDirectory = false;
  try { isDirectory = fs.statSync(root).isDirectory(); } catch {}
  const has = (name) => { try { return fs.statSync(path.join(root, name)).isDirectory(); } catch { return false; } };
  return { path: root, key: metadata.key, label: metadata.label, stats_source: metadata.key ? dshRootSource(metadata.key) : undefined, origin, exists: isDirectory, has_sessions: isDirectory && has("sessions") };
}

function resolveDshRootsSync({ home = os.homedir(), env = process.env, trackerDir, configPath = configPathFor({ home, trackerDir }), platform = process.platform, discoverWslHome = wsl.discoverWslHome } = {}) {
  const config = readConfig(configPath);
  const configured = Array.isArray(config.dshHomes) && config.dshHomes.length > 0;
  const override = (typeof env?.TOKENTRACKER_DSH_HOME === "string" && env.TOKENTRACKER_DSH_HOME.trim())
    || (typeof env?.DSH_HOME === "string" && env.DSH_HOME.trim())
    || "";
  const hasOverride = Boolean(override);
  const source = configured ? "configured" : (hasOverride ? "environment" : "default");
  const raw = configured ? config.dshHomes : [hasOverride ? override : path.join(home, ".dsh")];
  const normalized = normalizeRootRecords(raw, { home, platform, requireExistingParent: false });
  const roots = normalized.map((root) => probeRoot(root.path, source, root));
  if (!configured && platform === "win32" && !hasOverride && wsl.shouldProbeWsl(env)) {
    const wslHome = discoverWslHome(".dsh", { env });
    if (wslHome) {
      const resolved = path.resolve(wslHome);
      if (!roots.some((root) => identityFor(root.path, platform) === identityFor(resolved, platform))) {
        const identity = identityFor(resolved, platform);
        const key = derivedRootKey(resolved, identity);
        const state = probeRoot(resolved, "wsl", { key, label: dshRootLabelFromKey(key) });
        if (state.has_sessions) roots.push(state);
      }
    }
  }
  return { roots, configured, source, max_roots: MAX_DSH_ROOTS };
}

async function saveDshRoots(inputs, { home = os.homedir(), trackerDir, configPath = configPathFor({ home, trackerDir }), platform = process.platform, env = process.env } = {}) {
  const roots = normalizeRootRecords(inputs, { home, platform });
  const config = readConfig(configPath);
  await writeFileAtomic(configPath, `${JSON.stringify({ ...config, dshHomes: roots }, null, 2)}\n`, { mode: 0o600 });
  await chmod600IfPossible(configPath);
  return resolveDshRootsSync({ home, trackerDir, configPath, platform, env });
}

module.exports = { MAX_DSH_ROOTS, DshRootsError, configPathFor, validateRoot, normalizeConfiguredRoots, normalizeRootRecords, resolveDshRootsSync, saveDshRoots };
