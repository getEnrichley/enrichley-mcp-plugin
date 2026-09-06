import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { findPngRuleIds, findTextRuleIds } from "./check-public-boundary.mjs";
import { parsePngChunks, stripPngMetadata } from "./png-metadata.mjs";

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data = Buffer.alloc(0)) => {
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  output.write(type, 4, 4, "ascii");
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return output;
};
const rawChunk = (typeBytes, data = Buffer.alloc(0)) => {
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBytes.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return output;
};
const png = (...chunks) => Buffer.concat([signature, ...chunks, chunk("IEND")]);
const boundaryScript = fileURLToPath(new URL("./check-public-boundary.mjs", import.meta.url));
const markerText = "See /" + "Users/example/history fixture.";

const git = (repo, args, options = {}) =>
  execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
const initializeRepository = () => {
  const repo = mkdtempSync(join(tmpdir(), "public-boundary-fixture-"));
  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.name", "Enrichley Bot"]);
  git(repo, ["config", "user.email", "agent@enrichley.com"]);
  writeFileSync(join(repo, "README.md"), "Public fixture.\n");
  git(repo, ["add", "README.md"]);
  git(repo, ["-c", "commit.gpgSign=false", "commit", "-m", "Initial public fixture"]);
  return repo;
};
const commitAll = (repo, message, extra = []) => {
  git(repo, ["add", "-A"]);
  git(repo, ["-c", "commit.gpgSign=false", "commit", ...extra, "-m", message]);
};
const runBoundary = (repo, args) => {
  const result = spawnSync(process.execPath, [boundaryScript, ...args], {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
};
const expectFinding = (result, safePath, ruleId) => {
  assert.equal(result.status, 1, `expected ${ruleId}`);
  const expected = new RegExp(
    `^${safePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: ${ruleId} \\([0-9a-f]{12}\\)$`,
    "m",
  );
  assert.match(result.stderr, expected, `expected stable ${ruleId} diagnostic`);
  assert.equal(result.stderr.includes(markerText), false, "diagnostic exposed matching text");
  assert.equal(result.stderr.includes("public-boundary-fixture-"), false, "diagnostic exposed local path");
};
const withRepository = (callback) => {
  const repo = initializeRepository();
  try {
    callback(repo);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
};

assert.deepEqual(findTextRuleIds("README.md", "Public package documentation."), []);

// Synthetic credential fixtures are assembled so this test source remains public-safe.
const syntheticPayload = "A1b2C3d4".repeat(6);
for (const prefix of ["s" + "k-", "s" + "k-proj-", "s" + "k-ant-api03-", "s" + "k_live_", "r" + "k_test_", "un" + "key_"]) {
  assert.ok(findTextRuleIds("fixture.txt", prefix + syntheticPayload).includes("secret-provider-key"));
}
for (const name of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "CLOUDFLARE_API_TOKEN", "CLERK_SECRET_KEY", "UNKEY_TOKEN", "STRIPE_SECRET_KEY", "REDIS_PASSWORD", "UPSTASH_REDIS_REST_TOKEN"]) {
  for (const value of [name + "=" + syntheticPayload, JSON.stringify({ [name]: syntheticPayload })]) {
    assert.ok(findTextRuleIds("fixture.txt", value).includes("secret-contextual-assignment"));
  }
}
for (const scheme of ["http", "https", "redis", "rediss"]) {
  for (const user of ["default", ""]) {
    assert.ok(findTextRuleIds("fixture.txt", scheme + "://" + user + ":" + syntheticPayload + "@example.invalid").includes("secret-credential-url"));
  }
}
for (const safe of ["API_KEY", "API_KEY=${API_KEY}", "API_KEY=<configured privately>", "API_KEY=example_placeholder_value", "https://example.invalid/docs", "revision=" + syntheticPayload, "Bearer tokens must remain private."]) {
  assert.deepEqual(findTextRuleIds("fixture.txt", safe), []);
}

assert.deepEqual(findTextRuleIds("README.md", "See /" + "Users/example/private checkout."), [
  "personal-workstation-path",
]);
assert.deepEqual(
  findTextRuleIds("docs/release-ledger.md", "Revision 0123456789abcdef0123456789abcdef01234567"),
  ["ops-source-revision"],
);
assert.deepEqual(
  findTextRuleIds("docs/openai-directory-submission.md", "The account works" + " without a second step."),
  ["reviewer-auth-policy"],
);

const clean = png(chunk("IHDR", Buffer.alloc(13)), chunk("IDAT", Buffer.from("pixels")));
assert.deepEqual(findPngRuleIds(clean), []);

const tagged = png(
  chunk("IHDR", Buffer.alloc(13)),
  chunk("iTXt", Buffer.from("creator metadata")),
  chunk("IDAT", Buffer.from("pixels")),
);
assert.deepEqual(findPngRuleIds(tagged), ["png-metadata-chunk-iTXt"]);
const stripped = stripPngMetadata(tagged);
assert.deepEqual(findPngRuleIds(stripped), []);
assert.deepEqual(
  parsePngChunks(stripped).map(({ type }) => type),
  ["IHDR", "IDAT", "IEND"],
);

withRepository((repo) => {
  const base = git(repo, ["rev-parse", "HEAD"]);
  const secret = "s" + "k-proj-" + syntheticPayload;
  writeFileSync(join(repo, "fixture.txt"), secret);
  const current = runBoundary(repo, []);
  expectFinding(current, "fixture.txt", "secret-provider-key");
  assert.equal((current.stdout + current.stderr).includes(secret), false);
  commitAll(repo, "Add synthetic credential fixture");
  unlinkSync(join(repo, "fixture.txt"));
  commitAll(repo, "Remove synthetic credential fixture");
  const historical = runBoundary(repo, ["--base", base, "--history"]);
  expectFinding(historical, "fixture.txt", "secret-provider-key");
  assert.equal((historical.stdout + historical.stderr).includes(secret), false);
});

withRepository((repo) => {
  writeFileSync(join(repo, "opaque.dat"), Buffer.from([0xc3, 0x28, 0xff, 0xfe]));
  expectFinding(runBoundary(repo, []), "opaque.dat", "binary-unapproved");
});

withRepository((repo) => {
  const base = git(repo, ["rev-parse", "HEAD"]);
  writeFileSync(join(repo, "opaque.dat"), Buffer.from([0xc3, 0x28, 0xff, 0xfe]));
  commitAll(repo, "Add opaque fixture");
  expectFinding(runBoundary(repo, ["--base", base, "--history"]), "opaque.dat", "binary-unapproved");
});

withRepository((repo) => {
  const base = git(repo, ["rev-parse", "HEAD"]);
  mkdirSync(join(repo, "docs"));
  writeFileSync(join(repo, "docs/history-fixture.md"), `${markerText}\n`);
  commitAll(repo, "Add temporary public fixture");
  unlinkSync(join(repo, "docs/history-fixture.md"));
  commitAll(repo, "Remove temporary public fixture");
  expectFinding(
    runBoundary(repo, ["--base", base, "--history"]),
    "docs/history-fixture.md",
    "personal-workstation-path",
  );
});

withRepository((repo) => {
  git(repo, ["switch", "-c", "reachable-fixture"]);
  writeFileSync(join(repo, "reachable-fixture.md"), `${markerText}\n`);
  commitAll(repo, "Add reachable public fixture");
  git(repo, ["switch", "main"]);
  expectFinding(
    runBoundary(repo, ["--all-history"]),
    "reachable-fixture.md",
    "personal-workstation-path",
  );
});

withRepository((repo) => {
  const base = git(repo, ["rev-parse", "HEAD"]);
  writeFileSync(join(repo, "message-fixture.md"), "Public fixture.\n");
  commitAll(repo, markerText);
  expectFinding(runBoundary(repo, ["--base", base, "--history"]), "commit", "commit-message");
});

withRepository((repo) => {
  const base = git(repo, ["rev-parse", "HEAD"]);
  writeFileSync(join(repo, "author-fixture.md"), "Public fixture.\n");
  commitAll(repo, "Add author fixture", ["--author", "Unapproved Identity <invalid>"]);
  expectFinding(runBoundary(repo, ["--base", base, "--history"]), "commit", "commit-author");
});

withRepository((repo) => {
  const base = git(repo, ["rev-parse", "HEAD"]);
  writeFileSync(join(repo, "committer-fixture.md"), "Public fixture.\n");
  git(repo, ["add", "-A"]);
  git(repo, ["-c", "user.name=Unapproved Identity", "-c", "user.email=invalid", "commit", "-m", "Add committer fixture"]);
  expectFinding(runBoundary(repo, ["--base", base, "--history"]), "commit", "commit-committer");
});

withRepository((repo) => {
  const base = git(repo, ["rev-parse", "HEAD"]);
  writeFileSync(join(repo, "unapproved.bin"), Buffer.from([0, 1, 2, 3]));
  commitAll(repo, "Add binary fixture");
  expectFinding(runBoundary(repo, ["--base", base, "--history"]), "unapproved.bin", "binary-unapproved");
});

withRepository((repo) => {
  const base = git(repo, ["rev-parse", "HEAD"]);
  writeFileSync(join(repo, "target.txt"), "Public fixture.\n");
  symlinkSync("target.txt", join(repo, "linked.txt"));
  commitAll(repo, "Add symlink fixture");
  expectFinding(runBoundary(repo, ["--base", base, "--history"]), "linked.txt", "git-symlink");
});

withRepository((repo) => {
  const base = git(repo, ["rev-parse", "HEAD"]);
  const target = git(repo, ["rev-parse", "HEAD"]);
  git(repo, ["update-index", "--add", "--cacheinfo", `160000,${target},nested-package`]);
  git(repo, ["-c", "commit.gpgSign=false", "commit", "-m", "Add gitlink fixture"]);
  expectFinding(runBoundary(repo, ["--base", base, "--history"]), "nested-package", "git-submodule");
});

withRepository((repo) => {
  const base = git(repo, ["rev-parse", "HEAD"]);
  writeFileSync(join(repo, "unreadable.txt"), "Public fixture object.\n");
  commitAll(repo, "Add unreadable fixture");
  const objectId = git(repo, ["rev-parse", "HEAD:unreadable.txt"]);
  chmodSync(join(repo, ".git/objects", objectId.slice(0, 2), objectId.slice(2)), 0o000);
  expectFinding(runBoundary(repo, ["--base", base, "--history"]), "unreadable.txt", "object-unreadable");
});

withRepository((repo) => {
  const base = git(repo, ["rev-parse", "HEAD"]);
  writeFileSync(join(repo, "oversized.txt"), "A".repeat(1_000_001));
  commitAll(repo, "Add oversized fixture");
  expectFinding(runBoundary(repo, ["--base", base, "--history"]), "oversized.txt", "object-oversized");
});

const badCrc = Buffer.from(clean);
badCrc[badCrc.length - 1] ^= 1;
assert.deepEqual(findPngRuleIds(badCrc), ["png-invalid"]);
assert.deepEqual(
  findPngRuleIds(
    png(
      chunk("IHDR", Buffer.alloc(13)),
      rawChunk(Buffer.from([0xc9, 0x44, 0x41, 0x54]), Buffer.from("pixels")),
    ),
  ),
  ["png-invalid"],
);
assert.deepEqual(findPngRuleIds(Buffer.from("not a png")), ["png-invalid"]);
assert.deepEqual(findPngRuleIds(clean.subarray(0, clean.length - 13)), ["png-invalid"]);
assert.deepEqual(findPngRuleIds(clean.subarray(0, clean.length - 1)), ["png-invalid"]);
assert.deepEqual(
  findPngRuleIds(png(chunk("IHDR", Buffer.alloc(13)), chunk("I1AT", Buffer.from("pixels")))),
  ["png-invalid"],
);
assert.deepEqual(
  findPngRuleIds(png(chunk("IHDR", Buffer.alloc(13)), chunk("IDaT", Buffer.from("pixels")))),
  ["png-invalid"],
);
assert.deepEqual(findPngRuleIds(png(chunk("IDAT", Buffer.from("pixels")))), ["png-invalid"]);
assert.deepEqual(
  findPngRuleIds(png(chunk("IHDR", Buffer.alloc(13)), chunk("IHDR", Buffer.alloc(13)), chunk("IDAT"))),
  ["png-invalid"],
);
assert.deepEqual(
  findPngRuleIds(png(chunk("IHDR", Buffer.alloc(12)), chunk("IDAT", Buffer.from("pixels")))),
  ["png-invalid"],
);
assert.deepEqual(findPngRuleIds(png(chunk("IHDR", Buffer.alloc(13)))), ["png-invalid"]);
assert.deepEqual(
  findPngRuleIds(
    Buffer.concat([
      signature,
      chunk("IHDR", Buffer.alloc(13)),
      chunk("IDAT", Buffer.from("pixels")),
      chunk("IEND", Buffer.from([0])),
    ]),
  ),
  ["png-invalid"],
);
assert.deepEqual(
  findPngRuleIds(
    Buffer.concat([
      signature,
      chunk("IHDR", Buffer.alloc(13)),
      chunk("IDAT", Buffer.from("pixels")),
      chunk("IEND"),
      chunk("IEND"),
    ]),
  ),
  ["png-invalid"],
);
assert.deepEqual(
  findPngRuleIds(
    Buffer.concat([
      signature,
      chunk("IHDR", Buffer.alloc(13)),
      chunk("IEND"),
      chunk("IDAT", Buffer.from("pixels")),
    ]),
  ),
  ["png-invalid"],
);
assert.deepEqual(findPngRuleIds(Buffer.concat([clean, Buffer.from("trailing")])), ["png-invalid"]);
const validRgbIhdr = Buffer.alloc(13);
validRgbIhdr.writeUInt32BE(1, 0);
validRgbIhdr.writeUInt32BE(1, 4);
validRgbIhdr[8] = 8;
validRgbIhdr[9] = 2;
const validRgbIdat = deflateSync(Buffer.from([0, 0, 0, 0]));
const validPhys = Buffer.alloc(9);
validPhys.writeUInt32BE(1, 0);
validPhys.writeUInt32BE(1, 4);
validPhys[8] = 1;
assert.deepEqual(
  findPngRuleIds(
    png(
      chunk("IHDR", validRgbIhdr),
      chunk("IDAT", validRgbIdat),
      chunk("sRGB", Buffer.from([0])),
    ),
  ),
  ["png-invalid"],
);
assert.deepEqual(
  findPngRuleIds(
    png(chunk("IHDR", validRgbIhdr), chunk("IDAT", validRgbIdat), chunk("pHYs", validPhys)),
  ),
  ["png-invalid"],
);
assert.deepEqual(
  findPngRuleIds(
    png(
      chunk("IHDR", validRgbIhdr),
      chunk("sRGB", Buffer.from([0])),
      chunk("sRGB", Buffer.from([1])),
      chunk("IDAT", validRgbIdat),
    ),
  ),
  ["png-invalid"],
);
assert.deepEqual(
  findPngRuleIds(
    png(
      chunk("IHDR", validRgbIhdr),
      chunk("sRGB", Buffer.from([4])),
      chunk("IDAT", validRgbIdat),
    ),
  ),
  ["png-invalid"],
);
assert.deepEqual(
  findPngRuleIds(
    png(
      chunk("IHDR", Buffer.alloc(13)),
      chunk("bKGD", Buffer.from([0, 0, 0, 0, 0, 0])),
      chunk("IDAT", Buffer.from("pixels")),
    ),
  ),
  ["png-ancillary-unapproved-bKGD"],
);
const creatorTagged = png(
  chunk("IHDR", Buffer.alloc(13)),
  chunk("iTXt", Buffer.from("x:xmpmeta dc:creator xmp:CreatorTool")),
  chunk("IDAT", Buffer.from("pixels")),
);
assert.deepEqual(findPngRuleIds(creatorTagged), ["png-metadata-chunk-iTXt", "png-xmp-marker"]);

const equivalenceTagged = png(
  chunk("IHDR", Buffer.alloc(13)),
  chunk("sRGB", Buffer.from([0])),
  chunk("pHYs", Buffer.alloc(9)),
  chunk("iTXt", Buffer.from("creator metadata")),
  chunk("IDAT", Buffer.from("pixels-a")),
  chunk("IDAT", Buffer.from("pixels-b")),
);
const equivalenceStripped = stripPngMetadata(equivalenceTagged);
const rawChunks = (buffer, predicate) =>
  parsePngChunks(buffer)
    .filter(predicate)
    .map(({ start, end }) => buffer.subarray(start, end));
assert.deepEqual(
  rawChunks(equivalenceStripped, ({ type }) => /^[A-Z]/.test(type)),
  rawChunks(equivalenceTagged, ({ type }) => /^[A-Z]/.test(type)),
);
assert.deepEqual(
  rawChunks(equivalenceStripped, ({ type }) => type === "IDAT"),
  rawChunks(equivalenceTagged, ({ type }) => type === "IDAT"),
);
assert.deepEqual(
  parsePngChunks(equivalenceStripped).map(({ type }) => type),
  ["IHDR", "sRGB", "pHYs", "IDAT", "IDAT", "IEND"],
);

console.log("check-public-boundary tests: OK");
