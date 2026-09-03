"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { writeFileAtomic, chmod600IfPossible } = require("./fs");
const wsl = require("./wsl-probe");
const { resolveInstallPaths } = require("./install-resolver");

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

function expandHome(input, home) {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) throw new CodexRootsError("Codex root must not be empty");
  if (value === "~") return path.resolve(home);
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.resolve(home, value.slice(2));
  }
  return path.resolve(value);
}

function identityFor(root, platform = process.platform) {
  let identity = root;
  try {
    identity = fs.realpathSync.native(root);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  identity = path.normalize(identity);
  return platform === "win32" ? identity.toLowerCase() : identity;
}

function validateRoot(input, {
  home = os.homedir(),
  platform = process.platform,
  requireExistingParent = true,
} = {}) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) throw new CodexRootsError("Codex root must not be empty");
  if (raw !== "~" && !raw.startsWith("~/") && !raw.startsWith("~\\") && !path.isAbsolute(raw)) {
    throw new CodexRootsError(`Codex root must be an absolute path: ${raw}`);
  }
  const root = expandHome(raw, home);
  if (path.parse(root).root === root) {
    throw new CodexRootsError(`Codex root must not be a filesystem root: ${raw}`);
  }
  try {
    const stat = fs.statSync(root);
    if (!stat.isDirectory()) throw new CodexRootsError(`Codex root is not a directory: ${raw}`);
  } catch (error) {
    if (error instanceof CodexRootsError) throw error;
    if (error?.code !== "ENOENT") throw new CodexRootsError(`Unable to inspect Codex root ${raw}: ${error.message}`);
    if (!requireExistingParent) return { path: root, identity: identityFor(root, platform) };
    const parent = path.dirname(root);
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
    const normalized = validateRoot(input, options);
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

function probeRoot(root, origin) {
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
  const roots = normalizeConfiguredRoots(rawRoots, { home, platform, requireExistingParent: false });
  const includeNative = platform !== "win32" || wsl.shouldProbeNative(env);
  const states = includeNative ? roots.map((root) => probeRoot(root, source)) : [];
  const identities = new Set(roots.map((root) => identityFor(root, platform)));

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
      const state = probeRoot(path.resolve(wslRoot), "wsl");
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
  const roots = normalizeConfiguredRoots(inputs, { home, platform });
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
  resolveCodexRootsSync,
  resolveCodexRootPaths,
  saveCodexRoots,
};
