#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { TextDecoder } from "node:util";
import { pathToFileURL } from "node:url";
import {
  APPROVED_ANCILLARY_CHUNKS,
  FORBIDDEN_METADATA_CHUNKS,
  parsePngChunks,
} from "./png-metadata.mjs";

const EXPECTED_NAME = "Enrichley Bot";
const EXPECTED_EMAIL = "agent@enrichley.com";
const MAX_SCANNED_OBJECT_BYTES = 1_000_000;
const WORKTREE_OBJECT = "000000000000";
const STRICT_UTF8 = new TextDecoder("utf-8", { fatal: true });

const TEXT_RULES = [
  {
    id: "secret-private-key-block",
    pattern: new RegExp("-----BEGIN " + "(?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
  },
  {
    id: "secret-github-token",
    pattern: new RegExp("\\b(?:gh" + "[pousr]_[A-Za-z0-9]{20,}|github" + "_pat_[A-Za-z0-9_]{20,})\\b"),
  },
  {
    id: "secret-aws-access-key",
    pattern: new RegExp("\\b(?:AK" + "IA|ASIA)[A-Z0-9]{16}\\b"),
  },
  {
    id: "secret-contextual-assignment",
    // Opaque tokens need context: catch env/config assignments, including JSON.
    pattern: /(?:^|[\s{"',])(?:[A-Z][A-Z0-9]*_)*(?:API_KEY|API_TOKEN|ACCESS_TOKEN|AUTH_TOKEN|SECRET_KEY|SECRET|PASSWORD|TOKEN)["']?\s*[:=]\s*["']?(?!(?:example|placeholder|redacted|your_|replace_|test_fixture)(?:[A-Za-z0-9_-]*)(?:["'\s,;}\]]|$))[A-Za-z0-9_+/.=-]{20,}(?=["'\s,;}\]]|$)/im,
  },
  {
    id: "secret-jwt",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    id: "secret-credential-url",
    pattern: /\b[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/\s:@]*:[^@/\s]+@/,
  },
  {
    id: "personal-workstation-path",
    pattern: /(?:^|[\s"'`(])(?:\/Users\/|\/home\/|[A-Za-z]:\\Users\\)/m,
  },
  {
    id: "personal-github-noreply-email",
    pattern: /\b\d+\+[A-Za-z0-9-]+@users\.noreply\.github\.com\b/i,
  },
];

const RELEASE_LEDGER_RULES = [
  { id: "ops-source-revision", pattern: /\b[a-f0-9]{40}\b/i },
  {
    id: "ops-deployment-uuid",
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  },
  { id: "ops-workflow-run", pattern: /\bworkflow\s+run\s+`?\d+/i },
  {
    id: "ops-sensitive-field",
    pattern: /\|\s*[^|\n]*\b(?:deployment|runtime|worker|proxy|workflow|source|revision|commit)\b[^|\n]*\|/i,
  },
  { id: "ops-local-checkout-state", pattern: /\b(?:dirty|uncommitted)\s+(?:local\s+)?(?:checkout|worktree)\b/i },
];

const REVIEWER_DOC_RULES = [{ id: "reviewer-auth-policy", pattern: /\bworks?\s+without\b/i }];
const PNG_MARKER_RULES = [
  { id: "png-xmp-marker", pattern: /(?:x:xmpmeta|dc:creator|xmp:CreatorTool)/i },
];

function gitText(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function gitBuffer(args, input) {
  return execFileSync("git", args, {
    encoding: null,
    input,
    maxBuffer: MAX_SCANNED_OBJECT_BYTES + 64 * 1024,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "ignore"],
  });
}

function abbreviated(objectId) {
  return /^[0-9a-f]{12,}$/i.test(objectId ?? "")
    ? objectId.slice(0, 12).toLowerCase()
    : WORKTREE_OBJECT;
}

function safePath(filePath) {
  const normalized = String(filePath).replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.split("/").includes("..") ||
    /[\u0000-\u001f\u007f]/.test(normalized) ||
    findTextRuleIds("path", normalized).length > 0
  ) {
    return "redacted-path";
  }
  return normalized;
}

function finding(filePath, rule, objectId) {
  return { filePath: safePath(filePath), rule, objectId: abbreviated(objectId) };
}

function candidateFiles() {
  return gitText(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
    .split("\0")
    .filter(Boolean);
}

function trackedEntries() {
  const entries = new Map();
  const output = gitText(["ls-files", "--stage", "-z"]);
  for (const record of output.split("\0").filter(Boolean)) {
    const match = /^(\d{6}) ([0-9a-f]+) \d\t([\s\S]+)$/.exec(record);
    if (match) entries.set(match[3], { mode: match[1], objectId: match[2] });
  }
  return entries;
}

function looksText(buffer) {
  if (buffer.includes(0)) return false;
  try {
    STRICT_UTF8.decode(buffer);
    return true;
  } catch {
    return false;
  }
}

export function findTextRuleIds(filePath, text) {
  const rules = [...TEXT_RULES];
  if (filePath === "docs/release-ledger.md") rules.push(...RELEASE_LEDGER_RULES);
  if (filePath === "docs/openai-directory-submission.md") rules.push(...REVIEWER_DOC_RULES);
  return rules.filter(({ pattern }) => pattern.test(text)).map(({ id }) => id);
}

export function findPngRuleIds(buffer) {
  const failures = [];
  let chunks;
  try {
    chunks = parsePngChunks(buffer);
  } catch (error) {
    return [typeof error?.ruleId === "string" ? error.ruleId : "png-invalid"];
  }
  for (const { type } of chunks) {
    if (FORBIDDEN_METADATA_CHUNKS.has(type)) failures.push(`png-metadata-chunk-${type}`);
    if (/^[a-z]/.test(type) && !APPROVED_ANCILLARY_CHUNKS.has(type)) {
      failures.push(`png-ancillary-unapproved-${type}`);
    }
  }
  const latin1 = buffer.toString("latin1");
  for (const { id, pattern } of PNG_MARKER_RULES) {
    if (pattern.test(latin1)) failures.push(id);
  }
  return [...new Set(failures)];
}

function inspectBuffer(filePath, buffer, objectId) {
  if (path.extname(filePath).toLowerCase() === ".png") {
    return findPngRuleIds(buffer).map((rule) => finding(filePath, rule, objectId));
  }
  if (!looksText(buffer)) return [finding(filePath, "binary-unapproved", objectId)];
  return findTextRuleIds(filePath, buffer.toString("utf8")).map((rule) =>
    finding(filePath, rule, objectId),
  );
}

function currentTreeFailures() {
  const failures = [];
  const tracked = trackedEntries();
  for (const filePath of candidateFiles()) {
    const entry = tracked.get(filePath);
    let stats;
    try {
      stats = fs.lstatSync(path.resolve(filePath));
    } catch {
      failures.push(finding(filePath, "object-unreadable", entry?.objectId));
      continue;
    }
    if (entry?.mode === "160000") {
      failures.push(finding(filePath, "git-submodule", entry.objectId));
      continue;
    }
    if (entry?.mode === "120000" || stats.isSymbolicLink()) {
      failures.push(finding(filePath, "git-symlink", entry?.objectId));
      continue;
    }
    if (!stats.isFile()) {
      failures.push(finding(filePath, "binary-unapproved", entry?.objectId));
      continue;
    }
    if (stats.size > MAX_SCANNED_OBJECT_BYTES) {
      failures.push(finding(filePath, "object-oversized", entry?.objectId));
      continue;
    }
    let buffer;
    try {
      buffer = fs.readFileSync(path.resolve(filePath));
    } catch {
      failures.push(finding(filePath, "object-unreadable", entry?.objectId));
      continue;
    }
    let objectId = entry?.objectId;
    try {
      objectId = gitBuffer(["hash-object", "--stdin"], buffer).toString("utf8").trim();
    } catch {
      // The content is still inspected; the diagnostic uses the safe worktree sentinel.
    }
    failures.push(...inspectBuffer(filePath, buffer, objectId));
  }
  return failures;
}

function isCommit(revision) {
  if (!revision || /^0+$/.test(revision)) return false;
  try {
    execFileSync("git", ["cat-file", "-e", `${revision}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function parseArguments(argv) {
  let base = null;
  let history = false;
  let allHistory = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--base") {
      if (!argv[index + 1]) throw new Error("argument-invalid");
      base = argv[index + 1];
      index += 1;
    } else if (argument === "--history") {
      history = true;
    } else if (argument === "--all-history") {
      allHistory = true;
    } else {
      throw new Error("argument-invalid");
    }
  }
  if (history && allHistory) throw new Error("argument-invalid");
  if (history && !base) throw new Error("argument-invalid");
  if (allHistory && base) throw new Error("argument-invalid");
  return { allHistory, base, history };
}

function historyCommits({ allHistory, base, history }) {
  if (!history && !allHistory) return [];
  if (allHistory) return gitText(["rev-list", "--all", "--reverse"]).split("\n").filter(Boolean);
  if (!isCommit(base)) throw new Error("base-invalid");
  const mergeBase = gitText(["merge-base", base, "HEAD"]);
  return gitText(["rev-list", "--reverse", `${mergeBase}..HEAD`]).split("\n").filter(Boolean);
}

function commitFailures(commit) {
  const failures = [];
  let fields;
  try {
    fields = gitText(["show", "-s", "--format=%an%x00%ae%x00%cn%x00%ce%x00%B", commit]).split("\0");
  } catch {
    return [finding("commit", "object-unreadable", commit)];
  }
  const [authorName, authorEmail, committerName, committerEmail, ...messageParts] = fields;
  if (authorName !== EXPECTED_NAME || authorEmail !== EXPECTED_EMAIL) {
    failures.push(finding("commit", "commit-author", commit));
  }
  if (committerName !== EXPECTED_NAME || committerEmail !== EXPECTED_EMAIL) {
    failures.push(finding("commit", "commit-committer", commit));
  }
  if (findTextRuleIds("commit", messageParts.join("\0")).length > 0) {
    failures.push(finding("commit", "commit-message", commit));
  }
  return failures;
}

function treeEntries(commit) {
  let output;
  try {
    output = gitText(["ls-tree", "-rz", commit]);
  } catch {
    return { entries: [], error: finding("tree", "object-unreadable", commit) };
  }
  const entries = [];
  for (const record of output.split("\0").filter(Boolean)) {
    const match = /^(\d{6}) (blob|commit) ([0-9a-f]+)\t([\s\S]+)$/.exec(record);
    if (!match) return { entries: [], error: finding("tree", "object-unreadable", commit) };
    entries.push({ mode: match[1], type: match[2], objectId: match[3], filePath: match[4] });
  }
  return { entries, error: null };
}

function historyFailures(options) {
  const failures = [];
  for (const commit of historyCommits(options)) {
    failures.push(...commitFailures(commit));
    const { entries, error } = treeEntries(commit);
    if (error) {
      failures.push(error);
      continue;
    }
    for (const entry of entries) {
      if (entry.mode === "160000" || entry.type === "commit") {
        failures.push(finding(entry.filePath, "git-submodule", entry.objectId));
        continue;
      }
      if (entry.mode === "120000") {
        failures.push(finding(entry.filePath, "git-symlink", entry.objectId));
        continue;
      }
      let size;
      try {
        size = Number(gitText(["cat-file", "-s", entry.objectId]));
      } catch {
        failures.push(finding(entry.filePath, "object-unreadable", entry.objectId));
        continue;
      }
      if (!Number.isSafeInteger(size) || size < 0) {
        failures.push(finding(entry.filePath, "object-unreadable", entry.objectId));
        continue;
      }
      if (size > MAX_SCANNED_OBJECT_BYTES) {
        failures.push(finding(entry.filePath, "object-oversized", entry.objectId));
        continue;
      }
      let buffer;
      try {
        buffer = gitBuffer(["cat-file", "blob", entry.objectId]);
      } catch {
        failures.push(finding(entry.filePath, "object-unreadable", entry.objectId));
        continue;
      }
      failures.push(...inspectBuffer(entry.filePath, buffer, entry.objectId));
    }
  }
  return failures;
}

function uniqueSortedFindings(findings) {
  const byKey = new Map();
  for (const item of findings) {
    byKey.set(`${item.filePath}\0${item.rule}\0${item.objectId}`, item);
  }
  return [...byKey.values()].sort((left, right) =>
    `${left.filePath}\0${left.rule}\0${left.objectId}`.localeCompare(
      `${right.filePath}\0${right.rule}\0${right.objectId}`,
    ),
  );
}

function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch {
    console.error("boundary: argument-invalid (000000000000)");
    process.exitCode = 2;
    return;
  }

  let failures;
  try {
    failures = uniqueSortedFindings([...currentTreeFailures(), ...historyFailures(options)]);
  } catch {
    console.error("boundary: object-unreadable (000000000000)");
    process.exitCode = 1;
    return;
  }
  if (failures.length > 0) {
    for (const { filePath, rule, objectId } of failures) {
      console.error(`${filePath}: ${rule} (${objectId})`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`public boundary: OK (${candidateFiles().length} repository files)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
