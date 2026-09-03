"use strict";

const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { uninstallAllIntegrations } = require("../lib/integration-manager");
const { resolveTrackerPaths } = require("../lib/tracker-paths");

async function cmdUninstall(argv) {
  const opts = parseArgs(argv);
  const home = os.homedir();
  const { trackerDir, binDir } = await resolveTrackerPaths({ home });
  const integrations = await uninstallAllIntegrations({
    home,
    trackerDir,
    binDir,
    env: process.env,
  });

  await fs.unlink(path.join(binDir, "notify.cjs")).catch(() => {});
  await fs.rm(path.join(trackerDir, "app"), { recursive: true, force: true }).catch(() => {});

  // Keep the stable machine identity so a later reinstall does not create a
  // second cloud device and replay the same history under a new identifier.
  const machineIdSeedPath = path.join(home, ".config", "tokentracker", "machine-id");
  let machineIdSeedKept = false;
  if (opts.purge) {
    await fs.rm(path.join(home, ".tokentracker"), { recursive: true, force: true }).catch(() => {});
    machineIdSeedKept = await fs.access(machineIdSeedPath).then(
      () => true,
      () => false,
    );
  }

  process.stdout.write([
    "Uninstalled:",
    ...integrations.map(formatIntegrationRemoval),
    opts.purge ? `- Purged: ${path.join(home, ".tokentracker")}` : "- Purge: skipped (use --purge)",
    ...(machineIdSeedKept
      ? [`- Kept: ${machineIdSeedPath} (cloud device identity — a reinstall reuses the same device; delete it to fully reset)`]
      : []),
    "",
  ].join("\n"));
}

function formatIntegrationRemoval(entry) {
  if (entry.error) return `- ${entry.label}: failed (${entry.error})`;
  if (entry.id === "omp") return formatOmpHookRemoveLine(entry.result);
  const changed = entry.result?.removed === true || entry.result?.restored === true;
  return `- ${entry.label}: ${changed ? "removed" : "no change"}`;
}

function formatOmpHookRemoveLine(ompHookRemove) {
  if (ompHookRemove?.removed) {
    return `- oh-my-pi notify extension removed: ${ompHookRemove.extensionPath}`;
  }
  const reason = ompHookRemove?.skippedReason;
  const residualPath = ompHookRemove?.stagedPath || ompHookRemove?.extensionPath;
  const residual = residualPath ? ` (left in place: ${residualPath})` : "";
  if (reason === "unmanaged") {
    return `- oh-my-pi notify extension: skipped (unmanaged file)${residual}`;
  }
  if (reason === "unlink-failed") {
    const detail = ompHookRemove?.error ? `: ${ompHookRemove.error}` : "";
    return `- oh-my-pi notify extension: failed to remove${detail}${residual}`;
  }
  if (reason === "extension-read-failed") {
    const detail = ompHookRemove?.error ? `: ${ompHookRemove.error}` : "";
    return `- oh-my-pi notify extension: failed to read${detail}${residual}`;
  }
  if (reason === "identity-changed") {
    return `- oh-my-pi notify extension: skipped (file changed during uninstall)${residual}`;
  }
  if (reason === "omp-agent-dir-unresolved") {
    return "- oh-my-pi notify extension: skipped (omp agent dir unresolved)";
  }
  return "- oh-my-pi notify extension: no change";
}

function parseArgs(argv) {
  const out = { purge: false };
  for (const arg of argv) {
    if (arg === "--purge") out.purge = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return out;
}

module.exports = { cmdUninstall, formatOmpHookRemoveLine };
