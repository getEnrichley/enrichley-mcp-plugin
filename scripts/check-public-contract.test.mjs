import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findPublicContractRuleIds, findAppMappingRuleIds } from "./check-public-contract.mjs";

const expectedTools = [
  "enrichley_get_account_status",
  "enrichley_validate_email",
  "enrichley_list_jobs",
  "enrichley_get_job_metadata",
  "enrichley_get_download_instructions",
  "enrichley_get_job_status",
  "enrichley_create_people_search_discovery",
  "enrichley_list_people_search_discoveries",
  "enrichley_update_people_search_discovery",
  "enrichley_create_company_lookalike_discovery",
  "enrichley_list_company_lookalike_discoveries",
  "enrichley_update_company_lookalike_discovery",
  "enrichley_search_company_lookalike_industries",
  "enrichley_search_company_lookalike_states",
  "enrichley_search_company_lookalike_cities",
  "enrichley_list_business_context_profiles",
  "enrichley_get_business_context",
  "enrichley_get_result_schema",
  "enrichley_preview_people_search",
  "enrichley_preview_company_lookalike",
  "enrichley_confirm_paid_people_search_preview",
  "enrichley_prepare_people_search_run",
  "enrichley_run_people_search",
  "enrichley_prepare_company_lookalike_run",
  "enrichley_run_company_lookalike",
  "enrichley_prepare_email_finder_run",
  "enrichley_run_email_finder",
];

const validContract = {
  schemaVersion: 1,
  contractVersion: "1.1.0",
  packageName: "enrichley",
  appId: "asdk_app_fixture",
  serverName: "io.enrichley/enrichley",
  endpoint: "https://mcp.enrichley.io/mcp",
  toolCount: 27,
  groups: [
    { name: "Account", count: 1 },
    { name: "Jobs and downloads", count: 5 },
    { name: "People Search", count: 7 },
    { name: "Company Lookalike", count: 9 },
    { name: "Email Finder", count: 2 },
    { name: "Email Validation", count: 1 },
    { name: "Business Context", count: 2 },
  ],
  tools: expectedTools,
};

const clone = (value) => structuredClone(value);
const validSkill = expectedTools.map((name) => `\`${name}\``).join("\n");
const expectRule = (ruleId, mutate, skillText = validSkill) => {
  const candidate = clone(validContract);
  mutate(candidate);
  assert.ok(
    findPublicContractRuleIds(candidate, skillText).includes(ruleId),
    `expected ${ruleId}`,
  );
};

assert.deepEqual(findPublicContractRuleIds(validContract, validSkill), []);

expectRule("contract-shape", (candidate) => {
  candidate.notes = "public note";
});
expectRule("contract-private-field", (candidate) => {
  candidate.implementation = {};
});
expectRule("contract-package-name", (candidate) => {
  candidate.packageName = "different-package";
});
expectRule("contract-app-id", (candidate) => {
  candidate.appId = "different-public-app";
});
expectRule("contract-server-name", (candidate) => {
  candidate.serverName = "different-public-server";
});
expectRule("contract-endpoint", (candidate) => {
  candidate.endpoint = "https://example.invalid/mcp";
});
expectRule("contract-tool-count", (candidate) => {
  candidate.toolCount = 26;
});
expectRule("contract-tool-duplicate", (candidate) => {
  candidate.tools[26] = candidate.tools[25];
});
expectRule("contract-tool-order", (candidate) => {
  [candidate.tools[0], candidate.tools[1]] = [candidate.tools[1], candidate.tools[0]];
});
expectRule("contract-tool-set", (candidate) => {
  candidate.tools.splice(12, 1);
  candidate.toolCount = 26;
});
expectRule("contract-tool-set", (candidate) => {
  candidate.tools.push("enrichley_unknown_public_tool");
  candidate.toolCount = 28;
});
expectRule("contract-group-counts", (candidate) => {
  candidate.groups[2].count = 8;
});
expectRule("contract-group-counts", (candidate) => {
  candidate.groups.push({ name: "Unknown group", count: 0 });
});
expectRule("contract-skill-reference", () => {}, `${validSkill}\n\`enrichley_unknown_public_tool\``);

const publicSkill = readFileSync(new URL("../skills/using-enrichley/SKILL.md", import.meta.url), "utf8");
for (const lookupTool of [
  "enrichley_search_company_lookalike_industries",
  "enrichley_search_company_lookalike_states",
  "enrichley_search_company_lookalike_cities",
  "enrichley_list_business_context_profiles",
  "enrichley_get_business_context",
]) {
  assert.match(publicSkill, new RegExp(`\\b${lookupTool}\\b`));
}
assert.match(publicSkill, /prepare a run quote/i);
assert.match(publicSkill, /customer explicitly confirms/i);
assert.match(publicSkill, /never show it in ordinary prose/i);
assert.match(publicSkill, /Never ask for or accept the key's value/i);

console.log("check-public-contract tests: OK");

// Registration consistency is derived from the package mapping, not a pinned ID.
for (const id of ["asdk_app_fixture", "asdk_app_replacement"]) {
  const candidate = { ...validContract, appId: id };
  assert.deepEqual(findPublicContractRuleIds(candidate, validSkill), []);
  assert.deepEqual(findAppMappingRuleIds(candidate, { apps: { enrichley: { id } } }), []);
  assert.deepEqual(findAppMappingRuleIds(candidate, { apps: { enrichley: { id: "asdk_app_other" } } }), ["contract-app-id"]);
}
for (const app of [null, {}, { apps: {} }, { apps: { enrichley: { id: 1 } } }]) {
  assert.deepEqual(findAppMappingRuleIds(validContract, app), ["contract-app-id"]);
}
