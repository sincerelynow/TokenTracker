#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
: "${EXPECTED_INSFORGE_APPKEY:?Set EXPECTED_INSFORGE_APPKEY for the linked personal project}"

node -e '
  const project = require("./.insforge/project.json");
  if (project.appkey !== process.env.EXPECTED_INSFORGE_APPKEY) {
    throw new Error("Linked InsForge project does not match EXPECTED_INSFORGE_APPKEY");
  }
  console.log(`Deploying to ${project.appkey}.${project.region}.insforge.app`);
'

export npm_config_cache="${npm_config_cache:-/private/tmp/tokentracker-npm-cache}"
npx -y @insforge/cli db migrations up --all >/dev/null

for file in dashboard/edge-patches/tokentracker-*.ts; do
  slug="${file##*/}"
  slug="${slug%.ts}"
  for attempt in 1 2 3 4 5 6; do
    if result=$(npx -y @insforge/cli functions deploy "$slug" --file "$file" --json 2>&1); then
      printf '%s deployed\n' "$slug"
      break
    fi
    if [[ "$result" != *TOO_MANY_REQUESTS* && "$result" != *NETWORK_ERROR* ]] || [[ "$attempt" -eq 6 ]]; then
      printf '%s deployment failed: %s\n' "$slug" "$result" >&2
      exit 1
    fi
    sleep 60
  done
done
