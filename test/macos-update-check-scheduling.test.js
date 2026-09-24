const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8").replace(/\r\n/g, "\n");
}

test("macOS updater is disabled before any upstream request can start", () => {
  const source = read("TokenTrackerBar/TokenTrackerBar/Services/UpdateChecker.swift");
  const checkStart = source.indexOf("func check(silent: Bool = false)");
  assert.notEqual(checkStart, -1, "UpdateChecker.check should remain the native entry point");

  const checkBody = source.slice(checkStart);
  const disabledGuard = checkBody.indexOf("guard Self.updateChecksEnabled else { return }");
  const busyGuard = checkBody.indexOf("guard !isBusy else { return }");
  const fetchCall = checkBody.indexOf("self.fetchLatestRelease()");

  assert.equal(
    source.includes("private static let updateChecksEnabled = false"),
    true,
    "personal macOS builds must keep the updater gate disabled",
  );
  assert.notEqual(disabledGuard, -1, "check should reject personal builds");
  assert.notEqual(busyGuard, -1, "check should retain its in-flight guard");
  assert.notEqual(fetchCall, -1, "the historical fetch path should remain available behind the gate");
  assert.ok(disabledGuard < busyGuard, "the personal-build gate must run before update state changes");
  assert.ok(disabledGuard < fetchCall, "the personal-build gate must run before the release request");
});

test("macOS launch and menu surfaces do not schedule or expose upstream updates", () => {
  const app = read("TokenTrackerBar/TokenTrackerBar/TokenTrackerBarApp.swift");
  const statusBar = read("TokenTrackerBar/TokenTrackerBar/Services/StatusBarController.swift");

  assert.doesNotMatch(
    app,
    /UpdateChecker\.shared\.check\(silent:\s*true\)/,
    "launch must not start a silent upstream update check",
  );
  assert.doesNotMatch(
    app,
    /menuCheckForUpdates|checkForUpdates/,
    "the application menu must not retain an update action",
  );
  assert.doesNotMatch(
    statusBar,
    /menuCheckForUpdates|checkForUpdates|updateMenuItemTag|updateMenuStatusObserver|applyUpdateMenuItemState/,
    "the status-item menu must not retain an update action or status row",
  );
  assert.match(
    statusBar,
    /let version = UpdateChecker\.shared\.currentVersion\(\)/,
    "the status-item menu must continue to show the current app version",
  );
});

test("macOS bridge rejects legacy update controls and status payloads", () => {
  const source = read("TokenTrackerBar/TokenTrackerBar/Services/NativeBridge.swift");

  assert.doesNotMatch(source, /case\s+"checkForUpdates"/, "legacy manual update actions must not call the updater");
  assert.doesNotMatch(source, /case\s+"autoUpdateEnabled"/, "macOS must not expose the upstream auto-update toggle");
  assert.doesNotMatch(source, /"updateStatus"|"updateBusy"/, "disabled updater state must not be sent to the dashboard");
  assert.doesNotMatch(
    source,
    /updateCheckerStatusDidChange|UpdateChecker\.shared\.check\(/,
    "the bridge must not subscribe to or invoke upstream update checks",
  );
});
