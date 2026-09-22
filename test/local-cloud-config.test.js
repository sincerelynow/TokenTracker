"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { createLocalApiHandler } = require("../src/lib/local-api");

function requestCloudConfig(handler, method = "GET") {
  const req = { method, headers: {} };
  const res = {
    statusCode: 0,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    writeHead(status, headers) { this.statusCode = status; Object.assign(this.headers, headers); },
    end(body) { this.body = body; },
  };
  return handler(req, res, new URL("http://127.0.0.1/functions/tokentracker-cloud-config"))
    .then((handled) => ({ handled, status: res.statusCode, headers: res.headers, body: JSON.parse(res.body) }));
}

test("local dashboard cloud config reads public URL/key from config.json on every request", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tokentracker-local-cloud-config-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const configPath = path.join(dir, "config.json");
  const handler = createLocalApiHandler({ queuePath: path.join(dir, "queue.jsonl") });

  fs.writeFileSync(configPath, JSON.stringify({ baseUrl: "https://one.example", anonKey: "public-one", deviceToken: "private-token" }));
  const first = await requestCloudConfig(handler);
  assert.equal(first.status, 200);
  assert.equal(first.headers["Cache-Control"], "no-store");
  assert.deepEqual(first.body, { baseUrl: "https://one.example", anonKey: "public-one" });

  fs.writeFileSync(configPath, JSON.stringify({ baseUrl: "https://two.example", anonKey: "public-two" }));
  assert.deepEqual((await requestCloudConfig(handler)).body, { baseUrl: "https://two.example", anonKey: "public-two" });

  fs.writeFileSync(configPath, JSON.stringify({ baseUrl: "https://two.example" }));
  assert.deepEqual((await requestCloudConfig(handler)).body, { baseUrl: "", anonKey: "" });
  assert.equal((await requestCloudConfig(handler, "POST")).status, 405);
});
