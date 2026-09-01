import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const fail = (message) => {
  throw new Error(message);
};
const length = (value) => [...value].length;

const manifest = readJson(".codex-plugin/plugin.json");
const claudeManifest = readJson(".claude-plugin/plugin.json");
const claudeMarketplace = readJson(".claude-plugin/marketplace.json");
const appManifest = readJson(".app.json");
const listing = manifest.interface;

if (manifest.version !== claudeManifest.version || manifest.version !== claudeMarketplace.metadata.version) {
  fail("Claude and OpenAI plugin versions must match");
}
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version)) {
  fail("OpenAI plugin version must use semantic versioning");
}
if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(manifest.name)) {
  fail("OpenAI package name is invalid");
}

const requiredText = {
  displayName: listing.displayName,
  shortDescription: listing.shortDescription,
  longDescription: listing.longDescription,
  developerName: listing.developerName,
};
for (const [field, value] of Object.entries(requiredText)) {
  if (typeof value !== "string" || value.trim().length === 0) fail(`${field} is required`);
}
if (length(listing.displayName) > 30) fail("displayName exceeds 30 characters");
if (length(listing.shortDescription) > 30) fail("shortDescription exceeds 30 characters");
if (length(listing.longDescription) > 4_000) fail("longDescription exceeds 4,000 characters");
if (length(listing.developerName) > 80) fail("developerName exceeds 80 characters");

const categories = new Set([
  "Productivity",
  "Creativity",
  "Developer Tools",
  "Business & Operations",
  "Data & Analytics",
  "Communication",
  "Education & Research",
  "Security",
  "Finance",
  "Healthcare",
  "Travel",
  "Entertainment",
  "Other",
]);
if (!categories.has(listing.category)) fail("OpenAI listing category is invalid");
if (!Array.isArray(listing.capabilities) || listing.capabilities.length > 20) {
  fail("capabilities must contain at most 20 entries");
}
for (const capability of listing.capabilities) {
  if (typeof capability !== "string" || capability.trim().length === 0 || length(capability) > 120) {
    fail("Each capability must be a non-empty single-line string of at most 120 characters");
  }
}
if (!Array.isArray(listing.defaultPrompt) || listing.defaultPrompt.length > 3) {
  fail("defaultPrompt must contain at most three entries");
}
const normalizedPrompts = new Set();
for (const prompt of listing.defaultPrompt) {
  if (typeof prompt !== "string" || prompt.trim().length === 0 || length(prompt) > 128 || /[\r\n]/.test(prompt)) {
    fail("Each starter prompt must be one non-empty line of at most 128 characters");
  }
  if (prompt.includes("@")) fail("Starter prompts must not contain app mentions");
  const normalized = prompt.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (normalizedPrompts.has(normalized)) fail("Starter prompts must be unique");
  normalizedPrompts.add(normalized);
}

for (const field of ["websiteURL", "privacyPolicyURL", "termsOfServiceURL"]) {
  const value = listing[field];
  if (typeof value !== "string" || !value.startsWith("https://") || length(value) > 1_024) {
    fail(`${field} must be an HTTPS URL of at most 1,024 characters`);
  }
}
if (Object.hasOwn(listing, "supportURL") || Object.hasOwn(listing, "brandColorDark")) {
  fail("supportURL and brandColorDark belong in the submission portal, not the current package schema");
}

const channel = (hex) => {
  const value = Number.parseInt(hex, 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const match = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
  if (!match) fail("brandColor must be a six-digit hex color");
  return 0.2126 * channel(match[1]) + 0.7152 * channel(match[2]) + 0.0722 * channel(match[3]);
};
const whiteContrast = (1.05 / (luminance(listing.brandColor) + 0.05));
if (whiteContrast < 2) fail("brandColor must have at least 2:1 contrast against white");

for (const field of ["logo", "composerIcon"]) {
  const relativePath = listing[field];
  if (typeof relativePath !== "string" || !relativePath.startsWith("./")) {
    fail(`${field} must be a ./-prefixed package path`);
  }
  const absolutePath = path.join(root, relativePath);
  const image = fs.readFileSync(absolutePath);
  if (image.length > 5 * 1024 * 1024) fail(`${field} exceeds 5 MiB`);
  if (image.toString("ascii", 1, 4) !== "PNG") fail(`${field} must be a PNG image`);
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== height || width < 48 || width > 4_096) {
    fail(`${field} must be square and between 48 and 4,096 pixels`);
  }
}

const appId = appManifest.apps?.enrichley?.id;
if (typeof appId !== "string" || !/^asdk_app_[A-Za-z0-9_-]+$/.test(appId)) {
  fail(".app.json must map Enrichley to a registered MCP app");
}

console.log(`OpenAI directory package: ${manifest.name}@${manifest.version} ready`);
