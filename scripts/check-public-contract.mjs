import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const expectedFacts = Object.freeze({
  schemaVersion: 1,
  contractVersion: "1.1.0",
  packageName: "enrichley",
  serverName: "io.enrichley/enrichley",
  endpoint: "https://mcp.enrichley.io/mcp",
  toolCount: 27,
});

const expectedGroups = Object.freeze([
  Object.freeze({ name: "Account", count: 1 }),
  Object.freeze({ name: "Jobs and downloads", count: 5 }),
  Object.freeze({ name: "People Search", count: 7 }),
  Object.freeze({ name: "Company Lookalike", count: 9 }),
  Object.freeze({ name: "Email Finder", count: 2 }),
  Object.freeze({ name: "Email Validation", count: 1 }),
  Object.freeze({ name: "Business Context", count: 2 }),
]);

const expectedTools = Object.freeze([
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
]);

const topLevelKeys = Object.freeze([
  "appId",
  "contractVersion",
  "endpoint",
  "groups",
  "packageName",
  "schemaVersion",
  "serverName",
  "toolCount",
  "tools",
]);
const groupKeys = Object.freeze(["count", "name"]);
const privateFieldNames = new Set([
  "architecture",
  "deployment",
  "deployments",
  "hash",
  "implementation",
  "path",
  "paths",
  "repository",
  "repositories",
  "revision",
  "route",
  "routes",
  "schema",
  "schemas",
  "source",
  "split",
  "topology",
]);
const requiredSkillReferences = Object.freeze([
  "enrichley_search_company_lookalike_industries",
  "enrichley_search_company_lookalike_states",
  "enrichley_search_company_lookalike_cities",
  "enrichley_list_business_context_profiles",
  "enrichley_get_business_context",
]);
const spendSafetyPatterns = Object.freeze([
  /prepare a run quote/i,
  /customer explicitly confirms/i,
  /never show it in ordinary prose/i,
  /Never ask for or accept the key's value/i,
]);

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const sameKeys = (value, keys) =>
  isPlainObject(value) &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const addRule = (rules, ruleId) => {
  if (!rules.includes(ruleId)) rules.push(ruleId);
};

function containsPrivateField(value) {
  if (Array.isArray(value)) return value.some(containsPrivateField);
  if (!isPlainObject(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) => privateFieldNames.has(key) || containsPrivateField(nested),
  );
}

function toolReferences(skillText) {
  if (typeof skillText !== "string") return [];
  return [...new Set(skillText.match(/\benrichley_[a-z0-9_]+\b/g) ?? [])];
}

export function findPublicContractRuleIds(contract, skillText) {
  const rules = [];
  if (!sameKeys(contract, topLevelKeys)) addRule(rules, "contract-shape");
  if (containsPrivateField(contract)) addRule(rules, "contract-private-field");
  if (!isPlainObject(contract)) return rules;

  if (
    contract.schemaVersion !== expectedFacts.schemaVersion ||
    contract.contractVersion !== expectedFacts.contractVersion
  ) {
    addRule(rules, "contract-version");
  }
  if (contract.packageName !== expectedFacts.packageName) {
    addRule(rules, "contract-package-name");
  }
  if (typeof contract.appId !== "string" || !/^asdk_app_[A-Za-z0-9_-]+$/.test(contract.appId)) {
    addRule(rules, "contract-app-id");
  }
  if (contract.serverName !== expectedFacts.serverName) {
    addRule(rules, "contract-server-name");
  }
  if (contract.endpoint !== expectedFacts.endpoint) addRule(rules, "contract-endpoint");

  const tools = Array.isArray(contract.tools) ? contract.tools : [];
  if (!Array.isArray(contract.tools) || tools.some((tool) => typeof tool !== "string")) {
    addRule(rules, "contract-shape");
  }
  if (contract.toolCount !== expectedFacts.toolCount || tools.length !== expectedFacts.toolCount) {
    addRule(rules, "contract-tool-count");
  }
  if (new Set(tools).size !== tools.length) addRule(rules, "contract-tool-duplicate");
  if (
    tools.length !== expectedTools.length ||
    tools.some((tool) => !expectedTools.includes(tool)) ||
    expectedTools.some((tool) => !tools.includes(tool))
  ) {
    addRule(rules, "contract-tool-set");
  }
  if (
    tools.length !== expectedTools.length ||
    tools.some((tool, index) => tool !== expectedTools[index])
  ) {
    addRule(rules, "contract-tool-order");
  }

  const groups = Array.isArray(contract.groups) ? contract.groups : [];
  const groupShapeValid =
    Array.isArray(contract.groups) &&
    groups.every(
      (group) =>
        sameKeys(group, groupKeys) &&
        typeof group.name === "string" &&
        Number.isInteger(group.count) &&
        group.count >= 0,
    );
  if (!groupShapeValid) addRule(rules, "contract-shape");
  if (
    !groupShapeValid ||
    groups.length !== expectedGroups.length ||
    groups.some(
      (group, index) =>
        group.name !== expectedGroups[index]?.name || group.count !== expectedGroups[index]?.count,
    ) ||
    groups.reduce((total, group) => total + (Number.isInteger(group.count) ? group.count : 0), 0) !==
      expectedFacts.toolCount
  ) {
    addRule(rules, "contract-group-counts");
  }

  if (toolReferences(skillText).some((reference) => !expectedTools.includes(reference))) {
    addRule(rules, "contract-skill-reference");
  }
  return rules;
}

export function findPublicSkillRuleIds(skillText) {
  const rules = [];
  const references = toolReferences(skillText);
  if (requiredSkillReferences.some((reference) => !references.includes(reference))) {
    addRule(rules, "contract-skill-required-reference");
  }
  if (spendSafetyPatterns.some((pattern) => !pattern.test(skillText))) {
    addRule(rules, "contract-skill-safety");
  }
  return rules;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function findAppMappingRuleIds(contract, app) {
  const mappedId = app?.apps?.[contract.packageName]?.id;
  return typeof mappedId === "string" && /^asdk_app_[A-Za-z0-9_-]+$/.test(mappedId) && contract.appId === mappedId
    ? [] : ["contract-app-id"];
}

function manifestRuleIds(contract, root) {
  try {
    const claude = readJson(join(root, ".claude-plugin/plugin.json"));
    const codex = readJson(join(root, ".codex-plugin/plugin.json"));
    const app = readJson(join(root, ".app.json"));
    const mcp = readJson(join(root, ".mcp.json"));
    const server = readJson(join(root, "server.json"));
    const rules = [];
    if (contract.packageName !== claude.name || contract.packageName !== codex.name) {
      addRule(rules, "contract-package-name");
    }
    for (const rule of findAppMappingRuleIds(contract, app)) addRule(rules, rule);
    if (contract.serverName !== server.name) addRule(rules, "contract-server-name");
    if (
      contract.endpoint !== mcp.mcpServers?.[contract.packageName]?.url ||
      !server.remotes?.some((remote) => remote.url === contract.endpoint)
    ) {
      addRule(rules, "contract-endpoint");
    }
    return rules;
  } catch {
    return ["contract-manifest-read"];
  }
}

function run() {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  let contract;
  let skillText;
  try {
    contract = readJson(join(root, "contracts/mcp-public-surface.json"));
    skillText = readFileSync(join(root, "skills/using-enrichley/SKILL.md"), "utf8");
  } catch {
    console.error("public-contract: FAILED (contract-read)");
    process.exitCode = 1;
    return;
  }

  const rules = [
    ...findPublicContractRuleIds(contract, skillText),
    ...findPublicSkillRuleIds(skillText),
    ...manifestRuleIds(contract, root),
  ].filter((rule, index, all) => all.indexOf(rule) === index);
  if (rules.length > 0) {
    for (const rule of rules) console.error(`public-contract: FAILED (${rule})`);
    process.exitCode = 1;
    return;
  }
  console.log("public-contract: OK");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
