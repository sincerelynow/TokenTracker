"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { after, before, describe, it } = require("node:test");

const home = fs.mkdtempSync(path.join(os.tmpdir(), "tt-localapi-dsh-roots-"));
const previousHome = process.env.HOME;
process.env.HOME = home;
const trackerDir = path.join(home, ".tokentracker", "tracker");
const queuePath = path.join(trackerDir, "queue.jsonl");
const configPath = path.join(trackerDir, "config.json");
fs.mkdirSync(trackerDir, { recursive: true });
fs.writeFileSync(queuePath, "");
fs.writeFileSync(configPath, JSON.stringify({ keep: true }));
const { createLocalApiHandler } = require("../src/lib/local-api");

function req(method, pathname, headers = {}, body) {
  const input = body === undefined ? [] : [Buffer.from(typeof body === "string" ? body : JSON.stringify(body))];
  const request = Readable.from(input);
  request.method = method;
  request.url = pathname;
  request.headers = { host: "localhost", origin: "http://localhost:7680", ...headers };
  return request;
}
async function call(handler, method, pathname, headers, body) {
  let status = 200, raw = "";
  const response = { setHeader() {}, writeHead(code) { status = code; }, end(chunk) { if (chunk) raw += chunk; } };
  const request = req(method, pathname, headers, body);
  assert.equal(await handler(request, response, new URL(`http://localhost${pathname}`)), true);
  return { status, body: raw ? JSON.parse(raw) : null };
}

describe("local DSH roots API", () => {
  let handler, headers;
  before(async () => {
    handler = createLocalApiHandler({ queuePath });
    const auth = await call(handler, "GET", "/api/local-auth");
    headers = { "x-tokentracker-local-auth": auth.body.token };
  });
  after(() => {
    if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
    fs.rmSync(home, { recursive: true, force: true });
  });
  it("protects reads and writes", async () => {
    assert.equal((await call(handler, "GET", "/functions/tokentracker-dsh-roots")).status, 401);
    assert.equal((await call(handler, "POST", "/functions/tokentracker-dsh-roots", {}, { roots: [path.join(home, ".dsh")] })).status, 401);
  });
  it("saves stable root metadata and preserves config", async () => {
    const first = path.join(home, ".dsh"), second = path.join(home, "dsh-alt");
    fs.mkdirSync(path.join(first, "sessions"), { recursive: true });
    fs.mkdirSync(second, { recursive: true });
    const saved = await call(handler, "POST", "/functions/tokentracker-dsh-roots", headers, { roots: [first, second, first] });
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.body.roots.map((root) => root.path), [first, second]);
    assert.ok(saved.body.roots.every((root) => root.stats_source === `dsh-root:${root.key}`));
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    assert.equal(config.keep, true);
    const reloaded = await call(handler, "GET", "/functions/tokentracker-dsh-roots", headers);
    assert.deepEqual(reloaded.body.roots.map((root) => root.key), saved.body.roots.map((root) => root.key));
  });
  it("rejects invalid input without changing config", async () => {
    const original = fs.readFileSync(configPath, "utf8");
    const invalid = await call(handler, "POST", "/functions/tokentracker-dsh-roots", headers, { roots: ["relative"] });
    assert.equal(invalid.status, 400);
    assert.equal(fs.readFileSync(configPath, "utf8"), original);
  });
});
