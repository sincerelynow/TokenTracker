const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workflowPath = path.join(
  __dirname,
  "..",
  ".github",
  "workflows",
  "build-desktop-apps.yml",
);
const workflow = fs.readFileSync(workflowPath, "utf8");

test("personal desktop workflow is manual and read-only", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.doesNotMatch(workflow, /^\s+pull_request:/m);
  assert.doesNotMatch(workflow, /contents: write/);
});

test("personal desktop workflow can build every supported platform", () => {
  assert.match(workflow, /runs-on: macos-26/);
  assert.match(workflow, /runs-on: windows-latest/);
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.match(workflow, /target == 'all' \|\| inputs\.target == 'macos'/);
  assert.match(workflow, /target == 'all' \|\| inputs\.target == 'windows'/);
  assert.match(workflow, /target == 'all' \|\| inputs\.target == 'linux'/);
});

test("personal desktop workflow uploads Actions artifacts without creating releases", () => {
  const uploads = workflow.match(/uses: actions\/upload-artifact@v6/g) || [];
  assert.equal(uploads.length, 3);
  assert.doesNotMatch(workflow, /gh release/);
  assert.doesNotMatch(workflow, /gh api/);
  assert.doesNotMatch(workflow, /git tag/);
  assert.doesNotMatch(workflow, /refs\/tags/);
});
