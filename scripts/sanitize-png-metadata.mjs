#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { sanitizePngFile } from "./png-metadata.mjs";

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("Usage: node scripts/sanitize-png-metadata.mjs <png> [png ...]");
  process.exit(2);
}

for (const target of targets) {
  if (path.extname(target).toLowerCase() !== ".png") {
    console.error(`${target}: png-required`);
    process.exitCode = 1;
    continue;
  }
  try {
    const result = sanitizePngFile(target);
    console.log(`${target}: ${result.changed ? "metadata-removed" : "already-clean"}`);
  } catch {
    console.error(`${target}: invalid-png`);
    process.exitCode = 1;
  }
}
