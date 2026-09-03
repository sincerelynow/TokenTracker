"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  MAX_CODEX_ROOTS,
  normalizeConfiguredRoots,
  resolveCodexRootsSync,
  saveCodexRoots,
} = require("../src/lib/codex-roots");

async function fixture(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "tokentracker-codex-roots-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const trackerDir = path.join(home, ".tokentracker", "tracker");
  await fs.mkdir(trackerDir, { recursive: true });
  return { home, trackerDir, configPath: path.join(trackerDir, "config.json") };
}

test("falls back to CODEX_HOME and then the default root", async (t) => {
  const fx = await fixture(t);
  const envRoot = path.join(fx.home, ".codex-ipc");
  await fs.mkdir(envRoot);
  const fromEnv = resolveCodexRootsSync({ ...fx, env: { CODEX_HOME: envRoot }, includeWsl: false });
  assert.equal(fromEnv.source, "environment");
  assert.deepEqual(fromEnv.roots.map((root) => root.path), [envRoot]);

  const fallback = resolveCodexRootsSync({ ...fx, env: {}, includeWsl: false });
  assert.equal(fallback.source, "default");
  assert.deepEqual(fallback.roots.map((root) => root.path), [path.join(fx.home, ".codex")]);
});

test("saved roots override CODEX_HOME, expand tilde, dedupe, and preserve config fields", async (t) => {
  const fx = await fixture(t);
  const primary = path.join(fx.home, ".codex");
  const secondary = path.join(fx.home, ".codex-ipc");
  await fs.mkdir(primary);
  await fs.mkdir(secondary);
  await fs.writeFile(fx.configPath, JSON.stringify({ baseUrl: "https://example.test", custom: { keep: true } }));

  const saved = await saveCodexRoots(["~/.codex", secondary, primary], { ...fx, env: { CODEX_HOME: "ignored" } });
  assert.equal(saved.configured, true);
  assert.equal(saved.source, "configured");
  assert.deepEqual(saved.roots.map((root) => root.path), [primary, secondary]);
  const config = JSON.parse(await fs.readFile(fx.configPath, "utf8"));
  assert.equal(config.baseUrl, "https://example.test");
  assert.deepEqual(config.custom, { keep: true });
  assert.deepEqual(config.codexHomes, [primary, secondary]);
});

test("deduplicates existing roots by real path", async (t) => {
  const fx = await fixture(t);
  const target = path.join(fx.home, ".codex");
  const alias = path.join(fx.home, ".codex-link");
  await fs.mkdir(target);
  await fs.symlink(target, alias, process.platform === "win32" ? "junction" : "dir");
  assert.deepEqual(normalizeConfiguredRoots([target, alias], { home: fx.home }), [target]);
});

test("rejects unsafe roots and leaves the original config unchanged", async (t) => {
  const fx = await fixture(t);
  const file = path.join(fx.home, "not-a-directory");
  await fs.writeFile(file, "x");
  const original = `${JSON.stringify({ keep: true }, null, 2)}\n`;
  await fs.writeFile(fx.configPath, original);

  for (const roots of [[], ["relative/path"], [path.parse(fx.home).root], [file], [path.join(fx.home, "missing", "child")]]) {
    await assert.rejects(saveCodexRoots(roots, fx));
    assert.equal(await fs.readFile(fx.configPath, "utf8"), original);
  }
});

test("rejects more than the configured root limit", async (t) => {
  const fx = await fixture(t);
  const roots = [];
  for (let index = 0; index <= MAX_CODEX_ROOTS; index += 1) {
    const root = path.join(fx.home, `codex-${index}`);
    await fs.mkdir(root);
    roots.push(root);
  }
  await assert.rejects(saveCodexRoots(roots, fx), { code: "CODEX_ROOTS_LIMIT" });
});

test("reports session and archive directory probes", async (t) => {
  const fx = await fixture(t);
  const root = path.join(fx.home, ".codex");
  await fs.mkdir(path.join(root, "sessions"), { recursive: true });
  await saveCodexRoots([root], fx);
  const state = resolveCodexRootsSync({ ...fx, env: {}, includeWsl: false }).roots[0];
  assert.equal(state.exists, true);
  assert.equal(state.has_sessions, true);
  assert.equal(state.has_archived_sessions, false);
});
