const assert = require("node:assert/strict");
const test = require("node:test");

const {
  CLI_BACKGROUND_SYNC_INTERVAL_MS,
  WINDOWS_BACKGROUND_SYNC_INTERVAL_MS,
  startBackgroundSync,
} = require("../src/commands/serve");

test("native serve schedules a native-only lightweight all-source fallback sync", async () => {
  let intervalCallback = null;
  let intervalDelay = null;
  let clearedTimer = null;
  const timer = { unrefCalled: false, unref() { this.unrefCalled = true; } };
  const runSync = test.mock.fn(async () => {});
  const controller = startBackgroundSync({
    appShell: "windows",
    runSync,
    setIntervalFn(callback, delay) {
      intervalCallback = callback;
      intervalDelay = delay;
      return timer;
    },
    clearIntervalFn(value) {
      clearedTimer = value;
    },
  });

  assert.ok(controller);
  assert.equal(intervalDelay, WINDOWS_BACKGROUND_SYNC_INTERVAL_MS);
  assert.equal(timer.unrefCalled, true);
  intervalCallback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runSync.mock.callCount(), 1);
  assert.deepEqual(runSync.mock.calls[0].arguments[0], [
    "--auto",
    "--background",
    "--all-local-sources",
  ]);
  assert.equal(
    runSync.mock.calls[0].arguments[1].env.TOKENTRACKER_WSL_MODE,
    "native-only",
  );
  controller.stop();
  assert.equal(clearedTimer, timer);
});

test("background sync coalesces overlapping CLI ticks", async () => {
  let resolveSync;
  const errors = [];
  const runSync = test.mock.fn(() => new Promise((resolve) => { resolveSync = resolve; }));
  const controller = startBackgroundSync({
    appShell: "",
    runSync,
    setIntervalFn() { return 1; },
    clearIntervalFn() {},
    onError(error) { errors.push(error); },
  });

  const first = controller.run();
  const second = controller.run();
  assert.equal(first, second);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runSync.mock.callCount(), 1);
  resolveSync();
  await first;
  assert.deepEqual(errors, []);
  controller.stop();
});

test("macOS and Linux shells do not start a duplicate fallback timer", () => {
  const setIntervalFn = test.mock.fn();
  assert.equal(startBackgroundSync({ appShell: "macos", setIntervalFn }), null);
  assert.equal(startBackgroundSync({ appShell: "linux", setIntervalFn }), null);
  assert.equal(setIntervalFn.mock.callCount(), 0);
});

test("ordinary CLI serve schedules all local sources every five minutes", async () => {
  let callback;
  let delay;
  const runSync = test.mock.fn(async () => {});
  const controller = startBackgroundSync({
    appShell: "",
    runSync,
    setIntervalFn(next, nextDelay) {
      callback = next;
      delay = nextDelay;
      return { unref() {} };
    },
    clearIntervalFn() {},
  });
  assert.equal(delay, CLI_BACKGROUND_SYNC_INTERVAL_MS);
  callback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(runSync.mock.calls[0].arguments[0], [
    "--auto",
    "--background",
    "--all-local-sources",
  ]);
  assert.equal(runSync.mock.calls[0].arguments[1].env.TOKENTRACKER_WSL_MODE, undefined);
  controller.stop();
});
