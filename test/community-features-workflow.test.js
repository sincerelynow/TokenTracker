const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

for (const name of [
  "leaderboard-anticheat.yml",
  "leaderboard-freshness.yml",
  "leaderboard-moderation-audit.yml",
]) {
  test(`${name} uses the independent community feature switch`, () => {
    const source = fs.readFileSync(path.join(ROOT, ".github", "workflows", name), "utf8");
    assert.match(source, /vars\.TOKENTRACKER_ENABLE_COMMUNITY_FEATURES\s*==\s*'true'/);
    assert.match(source, /vars\.TOKENTRACKER_INSFORGE_BASE_URL/);
    assert.doesNotMatch(
      source,
      /if:\s*vars\.TOKENTRACKER_INSFORGE_BASE_URL\s*!=\s*''/,
      "community scheduling must not be controlled by the InsForge URL alone",
    );
  });
}
