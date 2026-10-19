"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const {
  discoverSessionFiles, scanCodexSession, buildSessionAnalytics,
  listSessionsForBrowser, summarizeSessions, sessionsToCsv,
} = require("../src/lib/session-analytics");

async function compressZstd(buf) {
  if (typeof zlib.zstdCompressSync === "function") return zlib.zstdCompressSync(buf);
  const { compress } = require("@mongodb-js/zstd");
  return Buffer.from(await compress(buf));
}

test("discoverSessionFiles groups live and compressed Codex archives by session id", async () => {
  const home = await fsp.mkdtemp(path.join(os.tmpdir(), "tt-codex-zst-group-"));
  try {
    const uuid = "019c26ca-e6bb-7e00-b33a-2ac67a11ddb9";
    const liveDir = path.join(home, ".codex", "sessions", "2026", "06", "09");
    const archiveDir = path.join(home, ".codex", "archived_sessions");
    await fsp.mkdir(liveDir, { recursive: true });
    await fsp.mkdir(archiveDir, { recursive: true });

    const usage = {
      input_tokens: 100,
      cached_input_tokens: 0,
      output_tokens: 50,
      reasoning_output_tokens: 0,
      total_tokens: 150,
    };
    const lines = [
      JSON.stringify({
        timestamp: "2026-06-09T10:00:00.000Z",
        type: "session_meta",
        payload: { id: uuid, cwd: "/tmp/proj" },
      }),
      JSON.stringify({
        timestamp: "2026-06-09T10:01:00.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: { last_token_usage: usage, total_token_usage: usage },
        },
      }),
    ].join("\n") + "\n";

    const livePath = path.join(liveDir, `rollout-2026-06-09T10-00-00-${uuid}.jsonl`);
    await fsp.writeFile(livePath, lines, "utf8");
    const archivePath = path.join(archiveDir, `rollout-2026-06-09T10-00-00-${uuid}.jsonl.zst`);
    await fsp.writeFile(archivePath, await compressZstd(Buffer.from(lines, "utf8")));

    const discovered = await discoverSessionFiles(home, {}, { probeWsl: false });
    const matching = discovered.codex.filter((group) =>
      group.filePaths.some((filePath) => filePath.includes(uuid)));
    assert.equal(matching.length, 1, "live + archive must share one session group");
    assert.equal(matching[0].filePaths.length, 2);

    const row = await scanCodexSession(matching[0].filePaths, matching[0].instance);
    assert.equal(row.model_usage?.[0]?.total_tokens, 150, "grouped live+archive must not double-count");
  } finally {
    await fsp.rm(home, { recursive: true, force: true });
  }
});

for (const extension of [".zst", ".zstd"]) test(`compressed Codex sessions preserve first-root ownership and rebuild v26 caches (${extension})`, async (t) => {
  const home = await fsp.mkdtemp(path.join(os.tmpdir(), "tt-codex-zst-roots-"));
  t.after(() => fsp.rm(home, { recursive: true, force: true }));
  const roots = [
    { path: path.join(home, ".codex"), key: "primary-11111111", label: "CODEX" },
    { path: path.join(home, ".codex-ipc"), key: "ipc-22222222", label: "CODEX_IPC" },
  ];
  const trackerDir = path.join(home, ".tokentracker", "tracker");
  await fsp.mkdir(trackerDir, { recursive: true });
  await fsp.writeFile(path.join(trackerDir, "config.json"), JSON.stringify({ codexHomes: roots }));
  const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
  const textFor = (id) => [
    { timestamp: "2026-06-09T10:00:00Z", type: "session_meta", payload: { id, cwd: "/tmp/proj" } },
    { timestamp: "2026-06-09T10:00:01Z", type: "turn_context", payload: { model: "gpt-6-sol" } },
    { timestamp: "2026-06-09T10:01:00Z", type: "event_msg", payload: { type: "token_count", info: {
      last_token_usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
      total_token_usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
    } } },
  ].map(JSON.stringify).join("\n") + "\n";
  const write = async (filePath, content) => {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, content);
  };
  await write(path.join(roots[0].path, "archived_sessions", `rollout-${ids[0]}.jsonl${extension}`),
    await compressZstd(Buffer.from(textFor(ids[0]))));
  await write(path.join(roots[1].path, "sessions", `rollout-${ids[0]}.jsonl`), textFor(ids[0]));
  await write(path.join(roots[1].path, "archived_sessions", `rollout-${ids[1]}.jsonl${extension}`),
    await compressZstd(Buffer.from(textFor(ids[1]))));

  const cold = await buildSessionAnalytics({ home, force: true });
  assert.equal(cold.length, 2);
  assert.equal(cold.reduce((sum, row) => sum + row.total_tokens, 0), 300);
  const sidecar = path.join(trackerDir, "session.queue.jsonl");
  const metaPath = `${sidecar}.meta.json`;
  const meta = JSON.parse(await fsp.readFile(metaPath, "utf8"));
  // A pre-compression inventory can be fresh, empty and have matching roots.
  // The version must invalidate it before the normal five-minute TTL hit.
  await fsp.writeFile(sidecar, "");
  await fsp.writeFile(metaPath, JSON.stringify({ ...meta, version: 26 }));
  const rebuilt = await buildSessionAnalytics({ home });
  const browser = listSessionsForBrowser(rebuilt).sessions;
  assert.equal(browser.length, 2);
  assert.equal(browser.reduce((sum, row) => sum + row.total_tokens, 0), 300);
  for (const [index, id] of ids.entries()) {
    const row = browser.find((candidate) => candidate.session_id === id);
    assert.equal(row.source, "codex");
    assert.equal(row.source_instance, roots[index].key);
    assert.equal(row.instance_label, roots[index].label);
  }
  assert.equal(JSON.stringify(browser).includes(home), false);
  const summary = summarizeSessions(rebuilt);
  const exported = JSON.stringify(summary) + sessionsToCsv(summary.sessions);
  for (const root of roots) assert.equal(exported.includes(root.key), false);
  assert.equal(exported.includes("source_instance"), false);
  assert.equal(exported.includes("instance_label"), false);
  assert.equal(exported.includes(home), false);
});
