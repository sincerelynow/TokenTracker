"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveDshRootsSync, saveDshRoots, DshRootsError } = require("../src/lib/dsh-roots");

function fixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-roots-"));
  const trackerDir = path.join(home, ".tokentracker", "tracker");
  const rootA = path.join(home, "dsh-a");
  const rootB = path.join(home, "dsh-b");
  fs.mkdirSync(trackerDir, { recursive: true });
  fs.mkdirSync(path.join(rootA, "sessions"), { recursive: true });
  fs.mkdirSync(rootB, { recursive: true });
  return { home, trackerDir, rootA, rootB, configPath: path.join(trackerDir, "config.json") };
}

test("DSH roots preserve fallback precedence and expose probes", () => {
  const f = fixture();
  const state = resolveDshRootsSync({ home: f.home, trackerDir: f.trackerDir, env: { TOKENTRACKER_DSH_HOME: f.rootA } });
  assert.equal(state.source, "environment");
  assert.deepEqual(state.roots.map((root) => root.path), [f.rootA]);
  assert.equal(state.roots[0].has_sessions, true);
});

test("saved DSH roots override environment and preserve unrelated config", async () => {
  const f = fixture();
  fs.writeFileSync(f.configPath, JSON.stringify({ machineId: "keep", dshHomes: [{ path: f.rootA }] }));
  const state = await saveDshRoots([{ path: "~/dsh-b" }, { path: f.rootB }], { home: f.home, trackerDir: f.trackerDir, env: { TOKENTRACKER_DSH_HOME: f.rootA } });
  assert.equal(state.configured, true);
  assert.deepEqual(state.roots.map((root) => root.path), [f.rootB]);
  assert.match(state.roots[0].stats_source, /^dsh-root:/);
  const saved = JSON.parse(fs.readFileSync(f.configPath, "utf8"));
  assert.equal(saved.machineId, "keep");
  assert.match(saved.dshHomes[0].key, /-[0-9a-f]{8}$/);
  assert.equal(typeof saved.dshHomes[0].label, "string");
});

test("invalid DSH roots are rejected", () => {
  const f = fixture();
  const { normalizeConfiguredRoots } = require("../src/lib/dsh-roots");
  assert.throws(() => normalizeConfiguredRoots(["relative"], { home: f.home, requireExistingParent: false }), DshRootsError);
  assert.throws(() => normalizeConfiguredRoots([path.parse(f.home).root], { home: f.home, requireExistingParent: false }), DshRootsError);
});
