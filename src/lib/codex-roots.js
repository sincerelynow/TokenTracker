"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const os = require("node:os");
const path = require("node:path");

const { writeFileAtomic, chmod600IfPossible } = require("./fs");
const wsl = require("./wsl-probe");
const { resolveInstallPaths } = require("./install-resolver");
const {
  codexRootLabelFromKey,
  codexRootSource,
  normalizeCodexRootKey,
} = require("./codex-source");

const MAX_CODEX_ROOTS = 16;

class CodexRootsError extends Error {
  constructor(message, code = "CODEX_ROOTS_INVALID") {
    super(message);
    this.name = "CodexRootsError";
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
    throw new CodexRootsError(`Unable to read TokenTracker config: ${error.message}`, "CODEX_ROOTS_CONFIG_INVALID");
  }
}

function expandHome(input, home, platform = process.platform) {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) throw new CodexRootsError("Codex root must not be empty");
  if (value === "~") return path.resolve(home);
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.resolve(home, value.slice(2));
  }
  if (platform === "win32" && path.win32.isAbsolute(value)) return value;
  return path.resolve(value);
}

function identityFor(root, platform = process.platform) {
  let identity = root;
  try {
    identity = fs.realpathSync.native(root);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  identity = platform === "win32" ? path.win32.normalize(identity) : path.normalize(identity);
  return platform === "win32" ? identity.toLowerCase() : identity;
}

function validateRoot(input, {
  home = os.homedir(),
  platform = process.platform,
  requireExistingParent = true,
} = {}) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) throw new CodexRootsError("Codex root must not be empty");
  const pathApi = platform === "win32" ? path.win32 : path;
  if (raw !== "~" && !raw.startsWith("~/") && !raw.startsWith("~\\") && !pathApi.isAbsolute(raw)) {
    throw new CodexRootsError(`Codex root must be an absolute path: ${raw}`);
  }
  const root = expandHome(raw, home, platform);
  if (pathApi.parse(root).root === root) {
    throw new CodexRootsError(`Codex root must not be a filesystem root: ${raw}`);
  }
  try {
    const stat = fs.statSync(root);
    if (!stat.isDirectory()) throw new CodexRootsError(`Codex root is not a directory: ${raw}`);
  } catch (error) {
    if (error instanceof CodexRootsError) throw error;
    if (error?.code !== "ENOENT") throw new CodexRootsError(`Unable to inspect Codex root ${raw}: ${error.message}`);
    if (!requireExistingParent) return { path: root, identity: identityFor(root, platform) };
    const parent = pathApi.dirname(root);
    try {
      if (!fs.statSync(parent).isDirectory()) {
        throw new CodexRootsError(`Codex root parent is not a directory: ${raw}`);
      }
    } catch (parentError) {
      if (parentError instanceof CodexRootsError) throw parentError;
      throw new CodexRootsError(`Codex root parent does not exist: ${raw}`);
    }
  }
  return { path: root, identity: identityFor(root, platform) };
}

function normalizeConfiguredRoots(inputs, options = {}) {
  if (!Array.isArray(inputs)) throw new CodexRootsError("roots must be an array");
  const roots = [];
  const identities = new Set();
  for (const input of inputs) {
    const normalized = validateRoot(typeof input === "string" ? input : input?.path, options);
    if (identities.has(normalized.identity)) continue;
    identities.add(normalized.identity);
    roots.push(normalized.path);
  }
  if (roots.length === 0) throw new CodexRootsError("At least one Codex root is required");
  if (roots.length > MAX_CODEX_ROOTS) {
    throw new CodexRootsError(`At most ${MAX_CODEX_ROOTS} Codex roots are allowed`, "CODEX_ROOTS_LIMIT");
  }
  return roots;
}

function rootKeyBase(root) {
  const base = path.basename(root).replace(/^\.+/, "").toLowerCase();
  const slug = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "codex";
}

function derivedRootKey(root, identity) {
  const digest = crypto.createHash("sha256").update(identity).digest("hex").slice(0, 8);
  return `${rootKeyBase(root).slice(0, 53)}-${digest}`;
}

function normalizeRootRecords(inputs, options = {}) {
  if (!Array.isArray(inputs)) throw new CodexRootsError("roots must be an array");
  const home = options.home || os.homedir();
  const platform = options.platform || process.platform;
  const resolvedOptions = { ...options, home, platform };
  const paths = normalizeConfiguredRoots(inputs, resolvedOptions);
  const records = [];
  const usedKeys = new Set();
  const usedLabels = new Set();
  for (const root of paths) {
    const identity = identityFor(root, platform);
    const original = inputs.find((input) => {
      try {
        return identityFor(expandHome(typeof input === "string" ? input : input?.path, home, platform), platform) === identity;
      } catch {
        return false;
      }
    });
    let key = normalizeCodexRootKey(typeof original === "object" ? original?.key : null)
      || derivedRootKey(root, identity);
    if (usedKeys.has(key)) key = derivedRootKey(root, `${identity}:${records.length}`);
    usedKeys.add(key);
    let label = typeof original === "object" && typeof original?.label === "string" && original.label.trim()
      ? original.label.trim().slice(0, 64)
      : codexRootLabelFromKey(key);
    if (usedLabels.has(label.toLowerCase())) {
      label = `${label.slice(0, 55)}_${key.slice(-8).toUpperCase()}`;
    }
    usedLabels.add(label.toLowerCase());
    records.push({ path: root, key, label });
  }
  return records;
}

function probeRoot(root, origin, metadata = {}) {
  let exists = false;
  let isDirectory = false;
  try {
    const stat = fs.statSync(root);
    exists = true;
    isDirectory = stat.isDirectory();
  } catch {}
  const childExists = (name) => {
    try {
      return fs.statSync(path.join(root, name)).isDirectory();
    } catch {
      return false;
    }
  };
  return {
    path: root,
    key: metadata.key,
    label: metadata.label,
    stats_source: metadata.key ? codexRootSource(metadata.key) : undefined,
    origin,
    exists: exists && isDirectory,
    has_sessions: isDirectory && childExists("sessions"),
    has_archived_sessions: isDirectory && childExists("archived_sessions"),
  };
}

function resolveCodexRootsSync({
  home = os.homedir(),
  env = process.env,
  trackerDir,
  configPath = configPathFor({ home, trackerDir }),
  platform = process.platform,
  includeWsl = true,
  discoverWslHome = wsl.discoverWslHome,
} = {}) {
  const config = readConfig(configPath);
  const configured = Array.isArray(config.codexHomes) && config.codexHomes.length > 0;
  const source = configured ? "configured" : (typeof env?.CODEX_HOME === "string" && env.CODEX_HOME.trim() ? "environment" : "default");
  const rawRoots = configured
    ? config.codexHomes
    : [source === "environment" ? env.CODEX_HOME.trim() : path.join(home, ".codex")];
  const roots = normalizeRootRecords(rawRoots, { home, platform, requireExistingParent: false });
  const includeNative = platform !== "win32" || wsl.shouldProbeNative(env);
  const states = includeNative ? roots.map((root) => probeRoot(root.path, source, root)) : [];
  const identities = new Set(roots.map((root) => identityFor(root.path, platform)));

  if (includeWsl && platform === "win32" && wsl.shouldProbeWsl(env)) {
    const wslRoot = discoverWslHome !== wsl.discoverWslHome
      ? discoverWslHome(".codex", { env })
      : resolveInstallPaths({
          nativeValue: null,
          wslDir: ".codex",
          requireAnyChild: ["sessions", "archived_sessions"],
          union: true,
        }, env, { platform }).wsl;
    if (wslRoot) {
      const identity = identityFor(wslRoot, platform);
      const resolvedWslRoot = path.resolve(wslRoot);
      const wslIdentity = identityFor(resolvedWslRoot, platform);
      const wslKey = derivedRootKey(resolvedWslRoot, wslIdentity);
      const state = probeRoot(resolvedWslRoot, "wsl", {
        key: wslKey,
        label: codexRootLabelFromKey(wslKey),
      });
      if (!identities.has(identity) && (state.has_sessions || state.has_archived_sessions)) {
        states.push(state);
      }
    }
  }

  return { roots: states, configured, source, max_roots: MAX_CODEX_ROOTS };
}

function resolveCodexRootPaths(options = {}) {
  return resolveCodexRootsSync(options).roots.map((root) => root.path);
}

async function saveCodexRoots(inputs, {
  home = os.homedir(),
  trackerDir,
  configPath = configPathFor({ home, trackerDir }),
  platform = process.platform,
  env = process.env,
} = {}) {
  const roots = normalizeRootRecords(inputs, { home, platform });
  const config = readConfig(configPath);
  await writeFileAtomic(configPath, `${JSON.stringify({ ...config, codexHomes: roots }, null, 2)}\n`, { mode: 0o600 });
  await chmod600IfPossible(configPath);
  return resolveCodexRootsSync({ home, trackerDir, configPath, platform, env });
}

module.exports = {
  MAX_CODEX_ROOTS,
  CodexRootsError,
  configPathFor,
  validateRoot,
  normalizeConfiguredRoots,
  normalizeRootRecords,
  resolveCodexRootsSync,
  resolveCodexRootPaths,
  saveCodexRoots,
};
