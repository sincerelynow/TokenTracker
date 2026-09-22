"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { drainQueueToCloud } = require("../src/commands/sync");

test("upload checkpoints are isolated by InsForge destination", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tokentracker-personal-insforge-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const queuePath = path.join(dir, "queue.jsonl");
  const queueStatePath = path.join(dir, "queue.state.json");
  fs.writeFileSync(queuePath, `${JSON.stringify({ source: "codex-root:a", model: "gpt", hour_start: "2026-01-01T00:00:00Z", input_tokens: 1, output_tokens: 2, total_tokens: 3 })}\n`);
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ inserted: 1, skipped: 0 }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  await drainQueueToCloud({ baseUrl: "https://one.example", deviceToken: "one", queuePath, queueStatePath, maxBatches: 1 });
  await drainQueueToCloud({ baseUrl: "https://two.example", deviceToken: "two", queuePath, queueStatePath, maxBatches: 1 });
  await drainQueueToCloud({ baseUrl: "https://two.example", deviceToken: "two", queuePath, queueStatePath, maxBatches: 1 });

  assert.equal(requests.length, 2, "each destination uploads once; the second sync is idempotent");
  const state = JSON.parse(fs.readFileSync(queueStatePath, "utf8"));
  assert.equal(Object.keys(state.destinations).length, 2);
  assert.ok(state.destinations["https://one.example"].offset > 0);
  assert.ok(state.destinations["https://two.example"].offset > 0);
});

test("a legacy offset does not suppress the first upload to a personal instance", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tokentracker-personal-legacy-offset-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const queuePath = path.join(dir, "queue.jsonl");
  const queueStatePath = path.join(dir, "queue.state.json");
  fs.writeFileSync(queuePath, `${JSON.stringify({ source: "dsh-root:one", model: "deepseek", hour_start: "2026-01-01T00:00:00Z", input_tokens: 5, output_tokens: 1, total_tokens: 6 })}\n`);
  fs.writeFileSync(queueStatePath, JSON.stringify({ offset: fs.statSync(queuePath).size }));
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ inserted: 1, skipped: 0 }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  await drainQueueToCloud({ baseUrl: "https://personal.example", deviceToken: "personal", queuePath, queueStatePath });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.hourly[0].source, "dsh-root:one");
  assert.equal(JSON.stringify(requests[0].body).includes(dir), false);
  assert.equal(JSON.parse(fs.readFileSync(queueStatePath, "utf8")).destinations["https://personal.example"].offset, fs.statSync(queuePath).size);
});

test("Codex and DSH root rows retain four independent sources without local paths", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tokentracker-four-roots-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const queuePath = path.join(dir, "queue.jsonl");
  const queueStatePath = path.join(dir, "queue.state.json");
  const sources = ["codex-root:first", "codex-root:second", "dsh-root:first", "dsh-root:second"];
  fs.writeFileSync(queuePath, sources.map((source, i) => JSON.stringify({
    source, model: "shared-model", hour_start: "2026-01-01T00:00:00Z",
    input_tokens: i + 1, output_tokens: 0, total_tokens: i + 1,
  })).join("\n") + "\n");
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ inserted: 4 }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const args = { baseUrl: "https://personal.example", deviceToken: "personal", queuePath, queueStatePath };
  await drainQueueToCloud(args);
  await drainQueueToCloud(args);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].hourly.map((row) => row.source), sources);
  assert.equal(requests[0].hourly.reduce((sum, row) => sum + row.total_tokens, 0), 10);
  assert.equal(JSON.stringify(requests[0]).includes(dir), false);
});
