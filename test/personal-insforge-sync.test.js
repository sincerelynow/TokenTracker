"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { compactPendingQueue } = require("../src/lib/upload-queue");
const { drainQueueToCloud, getCloudUploadCompactionOffset } = require("../src/commands/sync");

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

  await drainQueueToCloud({ baseUrl: "https://one.example", deviceToken: "one", accountId: "user", machineId: "machine", queuePath, queueStatePath, maxBatches: 1 });
  await drainQueueToCloud({ baseUrl: "https://two.example", deviceToken: "two", accountId: "user", machineId: "machine", queuePath, queueStatePath, maxBatches: 1 });
  await drainQueueToCloud({ baseUrl: "https://two.example", deviceToken: "two", accountId: "user", machineId: "machine", queuePath, queueStatePath, maxBatches: 1 });

  assert.equal(requests.length, 2, "each destination uploads once; the second sync is idempotent");
  const state = JSON.parse(fs.readFileSync(queueStatePath, "utf8"));
  assert.equal(Object.keys(state.destinations).length, 2);
  assert.ok(state.destinations["https://one.example"].accounts.user.machine.offset > 0);
  assert.ok(state.destinations["https://two.example"].accounts.user.machine.offset > 0);
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

  await drainQueueToCloud({ baseUrl: "https://personal.example", deviceToken: "personal", accountId: "user", machineId: "machine", queuePath, queueStatePath });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.hourly[0].source, "dsh-root:one");
  assert.equal(JSON.stringify(requests[0].body).includes(dir), false);
  assert.equal(JSON.parse(fs.readFileSync(queueStatePath, "utf8")).destinations["https://personal.example"].accounts.user.machine.offset, fs.statSync(queuePath).size);
});

test("same InsForge URL replays once for each user on the same machine", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tokentracker-account-switch-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const queuePath = path.join(dir, "queue.jsonl");
  const queueStatePath = path.join(dir, "queue.state.json");
  fs.writeFileSync(queuePath, `${JSON.stringify({ source: "codex", model: "gpt", hour_start: "2026-01-01T00:00:00Z", input_tokens: 10, output_tokens: 0, total_tokens: 10 })}\n`);
  fs.writeFileSync(queueStatePath, JSON.stringify({ destinations: { "https://personal.example": { offset: fs.statSync(queuePath).size } } }));
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    requests.push(init.headers.Authorization);
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => '{"inserted":1,"skipped":0}' };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const common = { baseUrl: "https://personal.example", machineId: "same-machine", queuePath, queueStatePath };
  await drainQueueToCloud({ ...common, accountId: "test-user", deviceToken: "test-token" });
  await drainQueueToCloud({ ...common, accountId: "formal-user", deviceToken: "formal-token" });
  await drainQueueToCloud({ ...common, accountId: "formal-user", deviceToken: "formal-token-rotated" });
  await drainQueueToCloud({ ...common, accountId: "test-user", deviceToken: "test-token" });
  await drainQueueToCloud({ ...common, machineId: "another-machine", accountId: "formal-user", deviceToken: "formal-other-machine-token" });
  assert.deepEqual(requests, ["Bearer test-token", "Bearer formal-token", "Bearer formal-other-machine-token"]);
  const accounts = JSON.parse(fs.readFileSync(queueStatePath, "utf8")).destinations["https://personal.example"].accounts;
  assert.equal(accounts["test-user"]["same-machine"].offset, fs.statSync(queuePath).size);
  assert.equal(accounts["formal-user"]["same-machine"].offset, fs.statSync(queuePath).size);
  assert.equal(accounts["formal-user"]["another-machine"].offset, fs.statSync(queuePath).size);
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


test("pending compaction preserves every destination, account and machine checkpoint", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tokentracker-multi-compaction-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const queuePath = path.join(dir, "queue.jsonl");
  const queueStatePath = path.join(dir, "queue.state.json");
  const encode = (model, tokens) => JSON.stringify({ source: "codex-root:first", model,
    hour_start: "2026-01-01T00:00:00Z", input_tokens: tokens, output_tokens: 0, total_tokens: tokens }) + "\n";
  const first = encode("one", 10);
  const second = encode("two", 20);
  const prefix = first + second;
  const oldTail = encode("three", 30);
  const latestTail = encode("three", 5);
  fs.writeFileSync(queuePath, prefix + oldTail + latestTail);
  const state = { offset: Buffer.byteLength(first), destinations: {
    "https://one.example": { accounts: { user: { machine: { offset: Buffer.byteLength(first) },
      other: { offset: Buffer.byteLength(prefix) } } } },
    "https://two.example": { accounts: { user: { machine: { offset: Buffer.byteLength(prefix) } },
      other: { machine: { offset: 0 } } } },
    "https://legacy.example": { offset: Buffer.byteLength(first) },
  } };
  fs.writeFileSync(queueStatePath, JSON.stringify(state));
  const result = await compactPendingQueue({ queuePath, offset: getCloudUploadCompactionOffset(state), minPendingBytes: 0 });
  assert.equal(result.compacted, true);
  assert.equal(fs.readFileSync(queuePath, "utf8"), prefix + latestTail);
  assert.deepEqual(JSON.parse(fs.readFileSync(queueStatePath, "utf8")), state);

  const requests = [];
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(init.body).hourly);
    return { ok: true, text: async () => '{"inserted":1}' };
  };
  const cases = [
    ["https://one.example", "user", "machine", [20, 5]],
    ["https://two.example", "user", "machine", [5]],
    ["https://one.example", "user", "other", [5]],
    ["https://two.example", "other", "machine", [10, 20, 5]],
    ["https://new.example", "new", "machine", [10, 20, 5]],
  ];
  for (const [baseUrl, accountId, machineId, expected] of cases) {
    const args = { baseUrl, accountId, machineId, deviceToken: "fixture", queuePath, queueStatePath };
    const count = requests.length;
    assert.equal((await drainQueueToCloud(args)).batches, 1);
    assert.deepEqual(requests[count].map((row) => row.total_tokens), expected);
    assert.equal((await drainQueueToCloud(args)).batches, 0);
    assert.equal(requests.length, count + 1);
  }
});
