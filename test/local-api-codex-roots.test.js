"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { after, before, describe, it } = require("node:test");

const home = fs.mkdtempSync(path.join(os.tmpdir(), "tt-localapi-codex-roots-"));
const previousHome = process.env.HOME;
const previousUserProfile = process.env.USERPROFILE;
const previousCodexHome = process.env.CODEX_HOME;
process.env.HOME = home;
process.env.USERPROFILE = home;
delete process.env.CODEX_HOME;
const trackerDir = path.join(home, ".tokentracker", "tracker");
const queuePath = path.join(trackerDir, "queue.jsonl");
const configPath = path.join(trackerDir, "config.json");
fs.mkdirSync(trackerDir, { recursive: true });
fs.writeFileSync(queuePath, "");
fs.writeFileSync(configPath, `${JSON.stringify({ keep: { value: 1 } }, null, 2)}\n`);
const { createLocalApiHandler } = require("../src/lib/local-api");

function request({ method = "GET", pathname, headers = {}, body, rawBody }) {
  const url = new URL(`http://localhost${pathname}`);
  const content = rawBody !== undefined ? rawBody : (body == null ? null : JSON.stringify(body));
  const req = Readable.from(content == null ? [] : [Buffer.from(content)]);
  req.method = method;
  req.url = url.pathname;
  req.headers = { host: "localhost", origin: "http://localhost:7680", ...headers };
  return { req, url };
}

function response() {
  let status = 200;
  let body = "";
  return {
    setHeader() {},
    writeHead(code) { status = code; },
    end(chunk) { if (chunk) body += chunk; },
    get result() { return { status, body: body ? JSON.parse(body) : null }; },
  };
}

async function call(handler, options) {
  const { req, url } = request(options);
  const res = response();
  assert.equal(await handler(req, res, url), true);
  return res.result;
}

describe("local Codex roots API", () => {
  let handler;
  let headers;

  before(async () => {
    handler = createLocalApiHandler({ queuePath });
    const auth = await call(handler, { pathname: "/api/local-auth" });
    headers = { "x-tokentracker-local-auth": auth.body.token };
  });

  after(() => {
    if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
    if (previousUserProfile === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = previousUserProfile;
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previousCodexHome;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("protects both reads and writes with local auth and loopback origin", async () => {
    assert.equal((await call(handler, { pathname: "/functions/tokentracker-codex-roots" })).status, 401);
    assert.equal((await call(handler, {
      pathname: "/functions/tokentracker-codex-roots",
      headers: { ...headers, origin: "https://example.com" },
    })).status, 401);
    assert.equal((await call(handler, {
      method: "POST",
      pathname: "/functions/tokentracker-codex-roots",
      body: { roots: [path.join(home, ".codex")] },
    })).status, 401);
  });

  it("returns fallback state and atomically saves normalized roots", async () => {
    const fallback = await call(handler, { pathname: "/functions/tokentracker-codex-roots", headers });
    assert.equal(fallback.status, 200);
    assert.equal(fallback.body.configured, false);
    assert.equal(fallback.body.source, "default");

    const first = path.join(home, ".codex");
    const second = path.join(home, ".codex-ipc");
    fs.mkdirSync(path.join(first, "sessions"), { recursive: true });
    fs.mkdirSync(path.join(second, "archived_sessions"), { recursive: true });
    const saved = await call(handler, {
      method: "POST",
      pathname: "/functions/tokentracker-codex-roots",
      headers,
      body: { roots: [first, second, first] },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.configured, true);
    assert.deepEqual(saved.body.roots.map((root) => root.path), [first, second]);
    assert.equal(saved.body.roots[0].has_sessions, true);
    assert.equal(saved.body.roots[1].has_archived_sessions, true);
    assert.deepEqual(JSON.parse(fs.readFileSync(configPath, "utf8")).keep, { value: 1 });
  });

  it("rejects invalid input without changing the config", async () => {
    const original = fs.readFileSync(configPath, "utf8");
    const invalid = await call(handler, {
      method: "POST",
      pathname: "/functions/tokentracker-codex-roots",
      headers,
      body: { roots: ["relative"] },
    });
    assert.equal(invalid.status, 400);
    assert.equal(fs.readFileSync(configPath, "utf8"), original);

    const malformed = await call(handler, {
      method: "POST",
      pathname: "/functions/tokentracker-codex-roots",
      headers,
      rawBody: "{",
    });
    assert.equal(malformed.status, 400);
    assert.equal(fs.readFileSync(configPath, "utf8"), original);
  });
});
