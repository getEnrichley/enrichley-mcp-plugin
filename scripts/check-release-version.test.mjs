import assert from "node:assert/strict";
import { isReleasePayloadPath, isVersionIncrease, parseSemver } from "./check-release-version.mjs";

assert.equal(isReleasePayloadPath("skills/using-enrichley/SKILL.md"), true);
assert.equal(isReleasePayloadPath(".claude-plugin/plugin.json"), true);
assert.equal(isReleasePayloadPath(".codex-plugin/plugin.json"), true);
assert.equal(isReleasePayloadPath(".agents/plugins/marketplace.json"), true);
assert.equal(isReleasePayloadPath(".app.json"), true);
assert.equal(isReleasePayloadPath(".mcp.json"), true);
assert.equal(isReleasePayloadPath("server.json"), true);
assert.equal(isReleasePayloadPath("assets/enrichley.png"), true);
assert.equal(isReleasePayloadPath("README.md"), false);
assert.equal(isReleasePayloadPath("docs/release-ledger.md"), false);

assert.deepEqual(parseSemver("0.1.5"), {
  major: 0,
  minor: 1,
  patch: 5,
  prerelease: null,
});
assert.equal(isVersionIncrease("0.1.4", "0.1.5"), true);
assert.equal(isVersionIncrease("0.1.5", "0.1.5"), false);
assert.equal(isVersionIncrease("0.1.5", "0.1.4"), false);
assert.equal(isVersionIncrease("1.0.0-beta.1", "1.0.0"), true);

console.log("check-release-version tests: OK");
