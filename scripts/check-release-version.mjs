import { execFileSync } from "node:child_process";
import fs from "node:fs";

const VERSION_FILES = [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".codex-plugin/plugin.json",
];

const RELEASE_PAYLOAD_PATTERNS = [
  /^skills\//,
  /^assets\//,
  /^\.claude-plugin\//,
  /^\.codex-plugin\//,
  /^\.agents\/plugins\//,
  /^\.app\.json$/,
  /^\.mcp\.json$/,
  /^server\.json$/,
];

function fail(message) {
  throw new Error(message);
}

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function parseArguments(argv) {
  const index = argv.indexOf("--base");
  if (index === -1 || !argv[index + 1]) {
    fail("Usage: node scripts/check-release-version.mjs --base <git-ref>");
  }
  return argv[index + 1];
}

function isUsableBase(base) {
  if (!base || /^0+$/.test(base)) return false;
  try {
    execFileSync("git", ["cat-file", "-e", `${base}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function isReleasePayloadPath(filePath) {
  return RELEASE_PAYLOAD_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(
    version,
  );
  if (!match) fail(`Invalid semantic version: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  };
}

export function isVersionIncrease(previous, current) {
  const left = parseSemver(previous);
  const right = parseSemver(current);
  for (const key of ["major", "minor", "patch"]) {
    if (right[key] > left[key]) return true;
    if (right[key] < left[key]) return false;
  }
  if (left.prerelease !== null && right.prerelease === null) return true;
  if (left.prerelease === null || right.prerelease === null) return false;
  return left.prerelease !== right.prerelease;
}

function currentVersions() {
  return VERSION_FILES.map((filePath) => {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const version =
      filePath === ".claude-plugin/marketplace.json"
        ? parsed.metadata?.version
        : parsed.version;
    if (typeof version !== "string") fail(`${filePath} has no release version`);
    return { filePath, version };
  });
}

function previousVersion(base) {
  const raw = runGit(["show", `${base}:.claude-plugin/plugin.json`]);
  const version = JSON.parse(raw).version;
  if (typeof version !== "string") fail("Base Claude manifest has no release version");
  return version;
}

function main() {
  const requestedBase = parseArguments(process.argv.slice(2));
  if (!isUsableBase(requestedBase)) {
    console.log("release version gate: no usable base commit; initial release accepted");
    return;
  }

  const base = runGit(["merge-base", requestedBase, "HEAD"]);
  const changedFiles = runGit(["diff", "--name-only", base, "--"])
    .split("\n")
    .filter(Boolean);
  const payloadChanges = changedFiles.filter(isReleasePayloadPath);
  const versions = currentVersions();
  const distinctVersions = new Set(versions.map(({ version }) => version));
  if (distinctVersions.size !== 1) {
    fail(
      `Release versions differ: ${versions
        .map(({ filePath, version }) => `${filePath}=${version}`)
        .join(", ")}`,
    );
  }

  const current = versions[0].version;
  parseSemver(current);
  if (payloadChanges.length === 0) {
    console.log(`release version gate: no plugin payload changes; ${current} unchanged is allowed`);
    return;
  }

  const previous = previousVersion(base);
  if (!isVersionIncrease(previous, current)) {
    fail(
      `Plugin payload changed without a version increase (${previous} -> ${current}): ${payloadChanges.join(
        ", ",
      )}`,
    );
  }

  console.log(
    `release version gate: ${previous} -> ${current}; ${payloadChanges.length} payload path(s) changed`,
  );
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
