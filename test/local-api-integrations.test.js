"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { after, before, describe, it } = require("node:test");

const home = fs.mkdtempSync(path.join(os.tmpdir(), "tt-localapi-integrations-"));
const previousHome = process.env.HOME;
const previousUserProfile = process.env.USERPROFILE;
process.env.HOME = home;
process.env.USERPROFILE = home;
const queuePath = path.join(home, ".tokentracker", "tracker", "queue.jsonl");
fs.mkdirSync(path.dirname(queuePath), { recursive: true });
fs.writeFileSync(queuePath, "");
fs.mkdirSync(path.join(home, ".claude"), { recursive: true });
fs.writeFileSync(path.join(home, ".claude", "settings.json"), "{}\n");
const { createLocalApiHandler } = require("../src/lib/local-api");

function request({ method = "GET", pathname, headers = {}, body }) {
  const url = new URL(`http://localhost${pathname}`);
  const req = Readable.from(body == null ? [] : [Buffer.from(JSON.stringify(body))]);
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

describe("local integrations API", () => {
  let handler;
  let token;

  before(async () => {
    handler = createLocalApiHandler({ queuePath });
    token = (await call(handler, { pathname: "/api/local-auth" })).body.token;
  });

  after(() => {
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    if (previousUserProfile === undefined) delete process.env.USERPROFILE;
    else process.env.USERPROFILE = previousUserProfile;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("lists provider status without authentication", async () => {
    const result = await call(handler, { pathname: "/functions/tokentracker-integrations" });
    assert.equal(result.status, 200);
    assert.ok(result.body.integrations.some((item) => item.id === "claude" && item.detected));
  });

  it("requires local authentication and validates provider input", async () => {
    const denied = await call(handler, {
      method: "POST",
      pathname: "/functions/tokentracker-integrations",
      body: { provider: "claude", action: "install" },
    });
    assert.equal(denied.status, 401);

    const bad = await call(handler, {
      method: "POST",
      pathname: "/functions/tokentracker-integrations",
      headers: { "x-tokentracker-local-auth": token },
      body: { provider: "unknown", action: "install" },
    });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, "INTEGRATION_NOT_FOUND");
  });

  it("installs and uninstalls one provider", async () => {
    const headers = { "x-tokentracker-local-auth": token };
    const installed = await call(handler, {
      method: "POST",
      pathname: "/functions/tokentracker-integrations",
      headers,
      body: { provider: "claude", action: "install" },
    });
    assert.equal(installed.status, 200);
    assert.equal(installed.body.integration.installed, true);

    const removed = await call(handler, {
      method: "POST",
      pathname: "/functions/tokentracker-integrations",
      headers,
      body: { provider: "claude", action: "uninstall" },
    });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.integration.installed, false);
  });

  it("isolates an operational provider failure", async () => {
    const settingsPath = path.join(home, ".claude", "settings.json");
    fs.rmSync(settingsPath, { force: true });
    fs.mkdirSync(settingsPath);
    const failed = await call(handler, {
      method: "POST",
      pathname: "/functions/tokentracker-integrations",
      headers: { "x-tokentracker-local-auth": token },
      body: { provider: "claude", action: "install" },
    });
    assert.equal(failed.status, 500);
    assert.ok(failed.body.error);

    const listed = await call(handler, { pathname: "/functions/tokentracker-integrations" });
    assert.equal(listed.status, 200);
    assert.ok(listed.body.integrations.some((item) => item.id === "codex"));
  });
});
