"use strict";

const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  buildAcodeNotifyCmd,
  buildCodexNotifyCmd,
  buildEveryCodeNotifyCmd,
  isManagedNotifyCmd,
  readAcodeNotify,
  readCodexNotify,
  readEveryCodeNotify,
  restoreAcodeNotify,
  restoreCodexNotify,
  restoreEveryCodeNotify,
  upsertAcodeNotify,
  upsertCodexNotify,
  upsertEveryCodeNotify,
} = require("./codex-config");
const {
  areClaudeUsageHooksConfigured,
  buildClaudeHookCommand,
  buildHookCommand,
  isClaudeHookConfigured,
  removeClaudeHook,
  removeClaudeUsageHooks,
  upsertClaudeHook,
  upsertClaudeUsageHooks,
} = require("./claude-config");
const {
  buildGeminiHookCommand,
  isGeminiHookConfigured,
  removeGeminiHook,
  resolveGeminiConfigDir,
  resolveGeminiSettingsPath,
  upsertGeminiHook,
} = require("./gemini-config");
const {
  isOpencodePluginInstalled,
  removeOpencodePlugin,
  resolveOpencodeConfigDir,
  upsertOpencodePlugin,
} = require("./opencode-config");
const {
  installOpenclawSessionPlugin,
  probeOpenclawSessionPluginState,
  removeOpenclawSessionPluginConfig,
} = require("./openclaw-session-plugin");
const { probeOpenclawHookState, removeOpenclawHookConfig } = require("./openclaw-hook");
const { probeGrokHookState, removeGrokHook, upsertGrokHook } = require("./grok-hook");
const { probeOmpHookState, removeOmpHook, upsertOmpHook } = require("./omp-hook");
const { resolveTrackerPaths } = require("./tracker-paths");

const operationLocks = new Map();

async function pathExists(target, type = null) {
  try {
    const stat = await fs.stat(target);
    if (type === "file") return stat.isFile();
    if (type === "dir") return stat.isDirectory();
    return true;
  } catch (_error) {
    return false;
  }
}

function buildContext({ home, trackerDir, binDir, env }) {
  const integrationEnv = { ...env, HOME: home };
  if (!integrationEnv.GROK_HOME && !integrationEnv.TOKENTRACKER_GROK_HOME) {
    integrationEnv.GROK_HOME = path.join(home, ".grok");
  }
  const notifyPath = path.join(binDir, "notify.cjs");
  const codexConfigPath = path.join(env.CODEX_HOME || path.join(home, ".codex"), "config.toml");
  const acodeConfigPath = path.join(
    env.TOKENTRACKER_ACODE_HOME || path.join(home, ".acode"),
    "config.toml",
  );
  const codeConfigPath = path.join(env.CODE_HOME || path.join(home, ".code"), "config.toml");
  const claudeDir = path.join(home, ".claude");
  const codebuddyDir = env.CODEBUDDY_HOME || path.join(home, ".codebuddy");
  const workbuddyDir = env.WORKBUDDY_HOME || path.join(home, ".workbuddy");
  const geminiConfigDir = resolveGeminiConfigDir({ home, env: integrationEnv });
  return {
    home,
    trackerDir,
    binDir,
    env: integrationEnv,
    notifyPath,
    codexConfigPath,
    acodeConfigPath,
    codeConfigPath,
    claudeDir,
    claudeSettingsPath: path.join(claudeDir, "settings.json"),
    codebuddyDir,
    codebuddySettingsPath: path.join(codebuddyDir, "settings.json"),
    workbuddyDir,
    workbuddySettingsPath: path.join(workbuddyDir, "settings.json"),
    geminiConfigDir,
    geminiSettingsPath: resolveGeminiSettingsPath({ configDir: geminiConfigDir }),
    opencodeConfigDir: resolveOpencodeConfigDir({ home, env: integrationEnv }),
    notifyOriginalPath: path.join(trackerDir, "codex_notify_original.json"),
    acodeNotifyOriginalPath: path.join(trackerDir, "acode_notify_original.json"),
    codeNotifyOriginalPath: path.join(trackerDir, "code_notify_original.json"),
  };
}

async function ensureRuntime(context) {
  const { installLocalTrackerApp, writeNotifyHandler } = require("../commands/init");
  await installLocalTrackerApp({ appDir: path.join(context.trackerDir, "app") });
  await writeNotifyHandler({
    trackerDir: context.trackerDir,
    binDir: context.binDir,
    notifyPath: context.notifyPath,
  });
}

function state(adapter, detected, installed, detail, extra = {}) {
  return {
    id: adapter.id,
    label: adapter.label,
    kind: adapter.kind,
    detected: Boolean(detected),
    installed: Boolean(installed),
    actionable: Boolean(detected || installed),
    detail,
    ...extra,
  };
}

const adapters = [
  {
    id: "codex",
    label: "Codex CLI",
    kind: "notify",
    async probe(c) {
      const detected = await pathExists(c.codexConfigPath, "file");
      const installed = detected && isManagedNotifyCmd(
        await readCodexNotify(c.codexConfigPath),
        buildCodexNotifyCmd(c.notifyPath),
      );
      return state(this, detected, installed, detected ? "config.toml detected" : "config.toml not found");
    },
    async install(c) {
      return upsertCodexNotify({
        codexConfigPath: c.codexConfigPath,
        notifyCmd: buildCodexNotifyCmd(c.notifyPath),
        notifyOriginalPath: c.notifyOriginalPath,
      });
    },
    async uninstall(c) {
      return restoreCodexNotify({
        codexConfigPath: c.codexConfigPath,
        notifyOriginalPath: c.notifyOriginalPath,
        notifyCmd: buildCodexNotifyCmd(c.notifyPath),
      });
    },
  },
  {
    id: "acode",
    label: "AStudio",
    kind: "notify",
    async probe(c) {
      const detected = await pathExists(c.acodeConfigPath, "file");
      const installed = detected && isManagedNotifyCmd(
        await readAcodeNotify(c.acodeConfigPath),
        buildAcodeNotifyCmd(c.notifyPath),
      );
      return state(this, detected, installed, detected ? "config.toml detected" : "config.toml not found");
    },
    async install(c) {
      return upsertAcodeNotify({
        acodeConfigPath: c.acodeConfigPath,
        notifyCmd: buildAcodeNotifyCmd(c.notifyPath),
        notifyOriginalPath: c.acodeNotifyOriginalPath,
      });
    },
    async uninstall(c) {
      return restoreAcodeNotify({
        acodeConfigPath: c.acodeConfigPath,
        notifyOriginalPath: c.acodeNotifyOriginalPath,
        notifyCmd: buildAcodeNotifyCmd(c.notifyPath),
      });
    },
  },
  {
    id: "every-code",
    label: "Every Code",
    kind: "notify",
    async probe(c) {
      const detected = await pathExists(c.codeConfigPath, "file");
      const installed = detected && isManagedNotifyCmd(
        await readEveryCodeNotify(c.codeConfigPath),
        buildEveryCodeNotifyCmd(c.notifyPath),
      );
      return state(this, detected, installed, detected ? "config.toml detected" : "config.toml not found");
    },
    async install(c) {
      return upsertEveryCodeNotify({
        codeConfigPath: c.codeConfigPath,
        notifyCmd: buildEveryCodeNotifyCmd(c.notifyPath),
        notifyOriginalPath: c.codeNotifyOriginalPath,
      });
    },
    async uninstall(c) {
      return restoreEveryCodeNotify({
        codeConfigPath: c.codeConfigPath,
        notifyOriginalPath: c.codeNotifyOriginalPath,
        notifyCmd: buildEveryCodeNotifyCmd(c.notifyPath),
      });
    },
  },
  {
    id: "claude",
    label: "Claude Code",
    kind: "hook",
    async probe(c) {
      const detected = await pathExists(c.claudeDir, "dir");
      const command = buildClaudeHookCommand(c.notifyPath);
      const installed = detected && await areClaudeUsageHooksConfigured({
        settingsPath: c.claudeSettingsPath,
        hookCommand: command,
      });
      return state(this, detected, installed, detected ? "Claude config detected" : "Claude config not found");
    },
    install(c) {
      return upsertClaudeUsageHooks({
        settingsPath: c.claudeSettingsPath,
        hookCommand: buildClaudeHookCommand(c.notifyPath),
      });
    },
    uninstall(c) {
      return removeClaudeUsageHooks({
        settingsPath: c.claudeSettingsPath,
        hookCommand: buildClaudeHookCommand(c.notifyPath),
      });
    },
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    kind: "hook",
    async probe(c) {
      const detected = await pathExists(c.geminiConfigDir, "dir");
      const installed = detected && await isGeminiHookConfigured({
        settingsPath: c.geminiSettingsPath,
        hookCommand: buildGeminiHookCommand(c.notifyPath),
      });
      return state(this, detected, installed, detected ? "Gemini config detected" : "Gemini config not found");
    },
    install(c) {
      return upsertGeminiHook({
        settingsPath: c.geminiSettingsPath,
        hookCommand: buildGeminiHookCommand(c.notifyPath),
      });
    },
    uninstall(c) {
      return removeGeminiHook({
        settingsPath: c.geminiSettingsPath,
        hookCommand: buildGeminiHookCommand(c.notifyPath),
      });
    },
  },
  ...[
    ["codebuddy", "CodeBuddy", "codebuddyDir", "codebuddySettingsPath"],
    ["workbuddy", "WorkBuddy", "workbuddyDir", "workbuddySettingsPath"],
  ].map(([id, label, dirKey, settingsKey]) => ({
    id,
    label,
    kind: "hook",
    async probe(c) {
      const detected = await pathExists(c[dirKey], "dir");
      const installed = detected && await isClaudeHookConfigured({
        settingsPath: c[settingsKey],
        hookCommand: buildHookCommand(c.notifyPath, id),
      });
      return state(this, detected, installed, detected ? `${label} config detected` : `${label} config not found`);
    },
    install(c) {
      return upsertClaudeHook({
        settingsPath: c[settingsKey],
        hookCommand: buildHookCommand(c.notifyPath, id),
      });
    },
    uninstall(c) {
      return removeClaudeHook({
        settingsPath: c[settingsKey],
        hookCommand: buildHookCommand(c.notifyPath, id),
      });
    },
  })),
  {
    id: "opencode",
    label: "OpenCode",
    kind: "plugin",
    async probe(c) {
      const detected = await pathExists(c.opencodeConfigDir, "dir");
      const installed = await isOpencodePluginInstalled({ configDir: c.opencodeConfigDir });
      return state(this, detected, installed, detected ? "OpenCode config detected" : "OpenCode config not found");
    },
    install(c) {
      return upsertOpencodePlugin({ configDir: c.opencodeConfigDir, notifyPath: c.notifyPath });
    },
    uninstall(c) {
      return removeOpencodePlugin({ configDir: c.opencodeConfigDir });
    },
  },
  {
    id: "openclaw",
    label: "OpenClaw",
    kind: "plugin",
    async probe(c) {
      const [plugin, legacyHook] = await Promise.all([
        probeOpenclawSessionPluginState(c),
        probeOpenclawHookState(c),
      ]);
      const detected = plugin.skippedReason !== "openclaw-config-missing"
        || legacyHook.skippedReason !== "openclaw-config-missing";
      const legacyInstalled = Boolean(
        legacyHook.configured || legacyHook.enabled || legacyHook.linked,
      );
      const detail = legacyInstalled
        ? "Legacy OpenClaw hook detected"
        : detected ? "OpenClaw config detected" : "OpenClaw config not found";
      return state(this, detected, plugin.configured || legacyInstalled, detail, {
        restartRequired: Boolean(plugin.configured),
      });
    },
    install(c) {
      return installOpenclawSessionPlugin({ ...c, packageName: "tokentracker-cli" });
    },
    async uninstall(c) {
      const plugin = await removeOpenclawSessionPluginConfig(c);
      const legacyHook = await removeOpenclawHookConfig(c);
      return {
        removed: Boolean(plugin.removed || legacyHook.removed),
        plugin,
        legacyHook,
      };
    },
  },
  {
    id: "grok",
    label: "Grok Build",
    kind: "hook",
    async probe(c) {
      const result = await probeGrokHookState(c);
      return state(this, result.hasGrokInstall, result.configured, result.hasGrokInstall ? "Grok Build detected" : "Grok Build not found");
    },
    install(c) {
      return upsertGrokHook(c);
    },
    uninstall(c) {
      return removeGrokHook(c);
    },
  },
  {
    id: "omp",
    label: "oh-my-pi",
    kind: "extension",
    async probe(c) {
      const result = await probeOmpHookState(c);
      const detail = result.exists && !result.managed
        ? "An unmanaged notify extension already exists"
        : result.ompPresent ? "oh-my-pi detected" : "oh-my-pi not found";
      return state(this, result.ompPresent, result.managed, detail, {
        actionable: Boolean(result.ompPresent && (!result.exists || result.managed)),
      });
    },
    install(c) {
      return upsertOmpHook(c);
    },
    uninstall(c) {
      return removeOmpHook(c);
    },
  },
];

const adapterById = new Map(adapters.map((adapter) => [adapter.id, adapter]));

async function resolveContext(options = {}) {
  const home = options.home || os.homedir();
  const paths = options.trackerDir && options.binDir
    ? options
    : { ...options, ...await resolveTrackerPaths({ home }) };
  return buildContext({
    home,
    trackerDir: paths.trackerDir,
    binDir: paths.binDir,
    env: options.env || process.env,
  });
}

async function listIntegrations(options = {}) {
  const context = await resolveContext(options);
  const integrations = await Promise.all(adapters.map(async (adapter) => {
    try {
      return await adapter.probe(context);
    } catch (error) {
      return state(adapter, false, false, "Unable to inspect integration", {
        error: error?.message || String(error),
      });
    }
  }));
  integrations.push({
    id: "passive-readers",
    label: "Other supported tools",
    kind: "passive",
    detected: true,
    installed: false,
    actionable: false,
    detail: "Read during scheduled and manual sync; no hook required",
  });
  return integrations;
}

async function getIntegration(provider, options = {}) {
  const adapter = adapterById.get(provider);
  if (!adapter) return null;
  const context = await resolveContext(options);
  return adapter.probe(context);
}

async function mutateIntegration(provider, action, options = {}) {
  const adapter = adapterById.get(provider);
  if (!adapter) {
    const error = new Error(`Unknown integration: ${provider}`);
    error.code = "INTEGRATION_NOT_FOUND";
    throw error;
  }
  if (action !== "install" && action !== "uninstall") {
    const error = new Error(`Unknown integration action: ${action}`);
    error.code = "INTEGRATION_ACTION_INVALID";
    throw error;
  }
  if (operationLocks.has(provider)) return operationLocks.get(provider);

  const pending = (async () => {
    const context = await resolveContext(options);
    const before = await adapter.probe(context);
    if (!before.detected && !before.installed) {
      const error = new Error(`${adapter.label} is not installed`);
      error.code = "INTEGRATION_NOT_DETECTED";
      throw error;
    }
    if (!before.actionable) {
      const error = new Error(before.detail || `${adapter.label} cannot be managed`);
      error.code = "INTEGRATION_NOT_ACTIONABLE";
      throw error;
    }
    if (action === "install") await ensureRuntime(context);
    const result = await adapter[action](context);
    if (result?.error || result?.skippedReason?.includes("failed")) {
      const error = new Error(result.error || result.skippedReason);
      error.code = "INTEGRATION_OPERATION_FAILED";
      throw error;
    }
    return { result, integration: await adapter.probe(context) };
  })().finally(() => {
    if (operationLocks.get(provider) === pending) operationLocks.delete(provider);
  });
  operationLocks.set(provider, pending);
  return pending;
}

async function uninstallAllIntegrations(options = {}) {
  const context = await resolveContext(options);
  const results = [];
  for (const adapter of adapters) {
    try {
      const result = await adapter.uninstall(context);
      results.push({ id: adapter.id, label: adapter.label, result, error: null });
    } catch (error) {
      results.push({
        id: adapter.id,
        label: adapter.label,
        result: null,
        error: error?.message || String(error),
      });
    }
  }
  return results;
}

module.exports = {
  MANAGED_INTEGRATION_IDS: adapters.map((adapter) => adapter.id),
  getIntegration,
  listIntegrations,
  mutateIntegration,
  uninstallAllIntegrations,
};
