"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const {
  listIntegrations,
  mutateIntegration,
  uninstallAllIntegrations,
} = require("../src/lib/integration-manager");
const {
  OPENCLAW_HOOK_NAME,
  ensureOpenclawHookFiles,
  resolveOpenclawHookPaths,
} = require("../src/lib/openclaw-hook");

test("integration manager installs and removes one provider while preserving other hooks", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "tt-integrations-"));
  const trackerDir = path.join(home, ".tokentracker", "tracker");
  const binDir = path.join(home, ".tokentracker", "bin");
  const settingsPath = path.join(home, ".claude", "settings.json");
  const existing = { hooks: { SessionEnd: [{ hooks: [{ type: "command", command: "custom-hook" }] }] } };
  try {
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(existing), "utf8");
    const options = { home, trackerDir, binDir, env: { HOME: home } };

    const before = await listIntegrations(options);
    assert.equal(before.find((item) => item.id === "claude").installed, false);
    assert.equal(before.find((item) => item.id === "passive-readers").actionable, false);

    const installed = await mutateIntegration("claude", "install", options);
    assert.equal(installed.integration.installed, true);
    assert.match(await fs.readFile(path.join(binDir, "notify.cjs"), "utf8"), /tokentracker-cli/);
    assert.match(await fs.readFile(settingsPath, "utf8"), /custom-hook/);

    const removed = await mutateIntegration("claude", "uninstall", options);
    assert.equal(removed.integration.installed, false);
    const finalSettings = JSON.parse(await fs.readFile(settingsPath, "utf8"));
    assert.match(JSON.stringify(finalSettings), /custom-hook/);
    assert.doesNotMatch(JSON.stringify(finalSettings), /notify\.cjs/);
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
});

test("integration manager rejects unknown providers and unavailable providers", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "tt-integrations-"));
  const options = {
    home,
    trackerDir: path.join(home, "tracker"),
    binDir: path.join(home, "bin"),
    env: { HOME: home },
  };
  try {
    await assert.rejects(
      mutateIntegration("unknown", "install", options),
      (error) => error.code === "INTEGRATION_NOT_FOUND",
    );
    await assert.rejects(
      mutateIntegration("claude", "install", options),
      (error) => error.code === "INTEGRATION_NOT_DETECTED",
    );
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
});

test("integration manager manages AStudio notify without automatic setup", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "tt-integrations-acode-"));
  const trackerDir = path.join(home, ".tokentracker", "tracker");
  const binDir = path.join(home, ".tokentracker", "bin");
  const acodeHome = path.join(home, ".acode");
  const configPath = path.join(acodeHome, "config.toml");
  const options = {
    home,
    trackerDir,
    binDir,
    env: { HOME: home, TOKENTRACKER_ACODE_HOME: acodeHome },
  };

  try {
    await fs.mkdir(acodeHome, { recursive: true });
    await fs.writeFile(configPath, 'model = "spark-x1"\n', "utf8");

    const before = await listIntegrations(options);
    assert.equal(before.find((item) => item.id === "acode").installed, false);

    const installed = await mutateIntegration("acode", "install", options);
    assert.equal(installed.integration.installed, true);
    assert.match(await fs.readFile(configPath, "utf8"), /--source=acode/);

    const removed = await mutateIntegration("acode", "uninstall", options);
    assert.equal(removed.integration.installed, false);
    assert.doesNotMatch(await fs.readFile(configPath, "utf8"), /--source=acode/);
    assert.match(await fs.readFile(configPath, "utf8"), /spark-x1/);
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
});

test("integration manager detects and safely removes the legacy OpenClaw hook", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "tt-integrations-openclaw-"));
  const trackerDir = path.join(home, ".tokentracker", "tracker");
  const binDir = path.join(home, ".tokentracker", "bin");
  const options = { home, trackerDir, binDir, env: { HOME: home } };
  try {
    const { hookDir, openclawConfigPath } = resolveOpenclawHookPaths(options);
    const keepDir = path.join(home, "keep-openclaw-hook");
    await ensureOpenclawHookFiles({ hookDir, trackerDir, packageName: "tokentracker-cli" });
    await fs.mkdir(path.dirname(openclawConfigPath), { recursive: true });
    await fs.writeFile(openclawConfigPath, `${JSON.stringify({
      hooks: {
        internal: {
          entries: {
            [OPENCLAW_HOOK_NAME]: { enabled: true },
            keep_hook: { enabled: true },
          },
          load: { extraDirs: [hookDir, keepDir] },
        },
      },
    }, null, 2)}\n`, "utf8");

    const before = await listIntegrations(options);
    const openclaw = before.find((item) => item.id === "openclaw");
    assert.equal(openclaw.installed, true);
    assert.match(openclaw.detail, /Legacy/);

    const results = await uninstallAllIntegrations(options);
    assert.equal(results.find((item) => item.id === "openclaw").result.removed, true);
    const config = JSON.parse(await fs.readFile(openclawConfigPath, "utf8"));
    assert.equal(config.hooks.internal.entries[OPENCLAW_HOOK_NAME], undefined);
    assert.deepEqual(config.hooks.internal.entries.keep_hook, { enabled: true });
    assert.deepEqual(config.hooks.internal.load.extraDirs, [keepDir]);
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
});
