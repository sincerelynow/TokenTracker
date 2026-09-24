const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..");

function readWindowsSource(file) {
  return fs
    .readFileSync(path.join(repoRoot, "TokenTrackerWin", file), "utf8")
    .replace(/\r\n/g, "\n");
}

test("Windows updater rejects all checks before any upstream request", () => {
  const source = readWindowsSource("UpdateChecker.cs");

  assert.match(
    source,
    /private const bool UpstreamUpdatesEnabled = false;/,
    "personal Windows builds must keep the upstream update channel disabled",
  );
  assert.match(
    source,
    /public async Task<CheckOutcome> CheckAsync\(bool silent\)\n\s*\{\n\s*if \(!UpstreamUpdatesEnabled\)[\s\S]*?return CheckOutcome\.Skipped;[\s\S]*?FetchLatestReleaseAsync\(\)/,
    "CheckAsync must return before reaching the release API",
  );
  assert.match(
    source,
    /public async Task<bool> DownloadAndInstallAsync\(\)\n\s*\{\n\s*if \(!UpstreamUpdatesEnabled\)[\s\S]*?return false;[\s\S]*?DownloadSetupAsync\(/,
    "the legacy installer path must also be disabled",
  );
});

test("Windows tray has no launch or periodic update scheduling", () => {
  const source = readWindowsSource("TrayApplicationContext.cs");

  assert.doesNotMatch(
    source,
    /UpdateCheckIntervalMinutes|_updateCheckTimer|CheckAsync\(/,
    "the resident tray must not schedule or launch update checks",
  );
  assert.doesNotMatch(
    source,
    /_checkUpdatesItem|OnCheckUpdatesClicked|RunManualCheckAsync|DownloadAndInstallAsync\(/,
    "the tray must not expose an update action or installer hand-off",
  );
});

test("legacy Dashboard update actions are ignored while sync and version remain wired", () => {
  const source = readWindowsSource("TrayApplicationContext.cs");

  assert.match(
    source,
    /case "syncNow":\n\s*_server\.TriggerSync\(\);/,
    "sync actions must remain available",
  );
  assert.match(
    source,
    /case "checkForUpdates":\n\s*\/\/ Ignore actions from older embedded Dashboard bundles\.\n\s*break;/,
    "old Dashboard update actions must be safely ignored",
  );
  assert.match(
    source,
    /version = _updateChecker\.CurrentVersion,/,
    "the local app version must remain available to the Dashboard",
  );
  assert.doesNotMatch(
    source,
    /autoUpdateEnabled|updateStatus|updateBusy/,
    "disabled update controls and state must not be pushed to the Dashboard",
  );
});
