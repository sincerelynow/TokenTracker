const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");
const { test } = require("node:test");

const { cmdInit } = require("../src/commands/init");
const { withHome } = require("./helpers/with-home");

function stripAnsi(text) {
  return String(text || "").replace(/\x1b\[[0-9;]*m/g, "");
}

test("dry-run reports that integrations are managed from the Dashboard", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tokentracker-init-dry-"));
  let restoreHome = () => {};
  const prevOpencodeConfigDir = process.env.OPENCODE_CONFIG_DIR;
  const prevToken = process.env.TOKENTRACKER_DEVICE_TOKEN;
  const prevWrite = process.stdout.write;

  let output = "";

  try {
    restoreHome = withHome(tmp);
    process.env.OPENCODE_CONFIG_DIR = path.join(tmp, ".config", "opencode");
    delete process.env.TOKENTRACKER_DEVICE_TOKEN;

    process.stdout.write = (chunk) => {
      output += String(chunk || "");
      return true;
    };

    await cmdInit([
      "--yes",
      "--dry-run",
      "--no-auth",
      "--no-open",
      "--base-url",
      "https://example.invalid",
    ]);

    const clean = stripAnsi(output);
    assert.match(clean, /AI tool integrations/);
    assert.match(clean, /Manage hooks and plugins from the local Dashboard/);
    await assert.rejects(fs.stat(process.env.OPENCODE_CONFIG_DIR), /ENOENT/);
  } finally {
    process.stdout.write = prevWrite;
    restoreHome();
    if (prevOpencodeConfigDir === undefined) delete process.env.OPENCODE_CONFIG_DIR;
    else process.env.OPENCODE_CONFIG_DIR = prevOpencodeConfigDir;
    if (prevToken === undefined) delete process.env.TOKENTRACKER_DEVICE_TOKEN;
    else process.env.TOKENTRACKER_DEVICE_TOKEN = prevToken;
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
