import fs from "node:fs";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRITICAL_CHUNKS = new Set(["IHDR", "PLTE", "IDAT", "IEND"]);
export const FORBIDDEN_METADATA_CHUNKS = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);
export const APPROVED_ANCILLARY_CHUNKS = new Set([
  "sRGB",
  "pHYs",
  ...FORBIDDEN_METADATA_CHUNKS,
]);

class PngValidationError extends Error {
  constructor(ruleId = "png-invalid") {
    super(ruleId);
    this.ruleId = ruleId;
  }
}

function invalid(ruleId) {
  throw new PngValidationError(ruleId);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validateChunkLength(type, length) {
  if (type === "IHDR" && length !== 13) invalid();
  if (type === "IEND" && length !== 0) invalid();
  if (type === "sRGB" && length !== 1) invalid();
  if (type === "pHYs" && length !== 9) invalid();
  if (type === "tIME" && length !== 7) invalid();
  if (type === "PLTE" && (length === 0 || length > 768 || length % 3 !== 0)) invalid();
}

function validateChunkType(type) {
  if (/^[A-Z]/.test(type) && !CRITICAL_CHUNKS.has(type)) invalid();
  if (/^[a-z]/.test(type) && !APPROVED_ANCILLARY_CHUNKS.has(type)) {
    invalid(`png-ancillary-unapproved-${type}`);
  }
}

function validateRawChunkType(typeBytes) {
  if (typeBytes.length !== 4) invalid();
  for (const byte of typeBytes) {
    const alphabetic = (byte >= 0x41 && byte <= 0x5a) || (byte >= 0x61 && byte <= 0x7a);
    if (!alphabetic) invalid();
  }
  if (typeBytes[2] < 0x41 || typeBytes[2] > 0x5a) invalid();
}

export function parsePngChunks(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < PNG_SIGNATURE.length) invalid();
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) invalid();

  const chunks = [];
  let offset = PNG_SIGNATURE.length;
  let foundEnd = false;
  let ihdrCount = 0;
  let idatCount = 0;
  let plteCount = 0;
  let idatClosed = false;
  let srgbSeen = false;

  while (offset < buffer.length) {
    if (foundEnd || offset + 12 > buffer.length) invalid();
    const length = buffer.readUInt32BE(offset);
    const typeBytes = buffer.subarray(offset + 4, offset + 8);
    validateRawChunkType(typeBytes);
    const type = typeBytes.toString("ascii");
    validateChunkType(type);
    validateChunkLength(type, length);

    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const end = dataEnd + 4;
    if (dataEnd < dataStart || end < dataEnd || end > buffer.length) invalid();
    const expectedCrc = buffer.readUInt32BE(dataEnd);
    const actualCrc = crc32(Buffer.concat([typeBytes, buffer.subarray(dataStart, dataEnd)]));
    if (expectedCrc !== actualCrc) invalid();

    if (chunks.length === 0 && type !== "IHDR") invalid();
    if (type === "IHDR") {
      ihdrCount += 1;
      if (ihdrCount !== 1 || chunks.length !== 0) invalid();
    } else if (ihdrCount !== 1) {
      invalid();
    }

    if (type === "sRGB") {
      if (idatCount > 0 || srgbSeen || buffer[dataStart] > 3) invalid();
      srgbSeen = true;
    }
    if (type === "pHYs" && idatCount > 0) invalid();
    if (type === "PLTE") {
      plteCount += 1;
      if (plteCount !== 1 || idatCount > 0) invalid();
    }
    if (type === "IDAT") {
      if (idatClosed) invalid();
      idatCount += 1;
    } else if (idatCount > 0 && type !== "IEND") {
      idatClosed = true;
    }
    if (type === "IEND") {
      if (idatCount === 0) invalid();
      foundEnd = true;
    }

    chunks.push({ type, start: offset, end, dataStart, dataEnd });
    offset = end;
  }

  if (!foundEnd || ihdrCount !== 1 || idatCount === 0 || offset !== buffer.length) invalid();
  return chunks;
}

export function stripPngMetadata(buffer) {
  const chunks = parsePngChunks(buffer);
  return Buffer.concat([
    PNG_SIGNATURE,
    ...chunks
      .filter(({ type }) => !FORBIDDEN_METADATA_CHUNKS.has(type))
      .map(({ start, end }) => buffer.subarray(start, end)),
  ]);
}

export function sanitizePngFile(filePath) {
  const original = fs.readFileSync(filePath);
  const sanitized = stripPngMetadata(original);
  if (!original.equals(sanitized)) fs.writeFileSync(filePath, sanitized);
  return {
    changed: !original.equals(sanitized),
    beforeBytes: original.length,
    afterBytes: sanitized.length,
  };
}
