"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");

function publicAnonFor(instance) {
  return [Buffer.from('{"alg":"HS256"}').toString("base64url"),
    Buffer.from(JSON.stringify({ role: "anon", instance })).toString("base64url"), "fixture-signature"].join(".");
}

async function bindPublicInstance(directory, baseUrl, anonKey, config = {}) {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "config.json"), JSON.stringify({ ...config, baseUrl, anonKey }), { mode: 0o600 });
  await fs.writeFile(path.join(directory, "runtime-instance.json"), JSON.stringify({
    fingerprint: createHash("sha256").update(`${baseUrl}\0${anonKey}`).digest("hex"),
  }), { mode: 0o600 });
}

// Windows may assign ephemeral ports blocked by Fetch (for example 6666).
async function listenForFetch(server) {
  const { badPortsSet } = require("undici/lib/web/fetch/constants");
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    if (!badPortsSet.has(String(server.address().port))) return;
    await new Promise(resolve => server.close(resolve));
  }
  throw new Error("Unable to allocate a Fetch-compatible loopback port");
}

module.exports = { publicAnonFor, bindPublicInstance, listenForFetch };
