import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { TEST_UPLOADS_BUCKET } from "../constants";
import { getInsforgeServerClient } from "../insforge/server";

const execFileAsync = promisify(execFile);

export function inferUploadMimeType(filename: string) {
  const normalized = filename.toLowerCase();

  if (normalized.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (normalized.endsWith(".png")) {
    return "image/png";
  }

  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }

  return "application/octet-stream";
}

export function inferUploadMimeTypeFromBytes(bytes: Uint8Array) {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return "application/octet-stream";
}

export function resolveUploadMimeType({
  displayName,
  storageKey,
  bytes,
}: {
  displayName?: string | null;
  storageKey?: string | null;
  bytes?: Uint8Array | null;
}) {
  const candidates = [displayName, storageKey];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const inferred = inferUploadMimeType(candidate);
    if (inferred !== "application/octet-stream") {
      return inferred;
    }
  }

  if (bytes) {
    return inferUploadMimeTypeFromBytes(bytes);
  }

  return "application/octet-stream";
}

async function renderPdfPageToPng(bytes: Uint8Array, pageNumber: number) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "nuet-problem-snapshot-"));
  const inputPath = path.join(tempDir, "source.pdf");
  const outputPrefix = path.join(tempDir, `page-${pageNumber}`);
  const outputPath = `${outputPrefix}.png`;

  try {
    await writeFile(inputPath, bytes);
    await execFileAsync("pdftoppm", [
      "-f",
      String(pageNumber),
      "-l",
      String(pageNumber),
      "-singlefile",
      "-png",
      inputPath,
      outputPrefix,
    ]);

    return await readFile(outputPath);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

async function uploadSnapshotBytes({
  bytes,
  uploadId,
  pageNumber,
}: {
  bytes: Uint8Array;
  uploadId: string;
  pageNumber: number;
}) {
  const insforge = getInsforgeServerClient();
  const timestamp = Date.now();
  const objectPath = `problem-snapshots/${uploadId}/${timestamp}-page-${pageNumber}.png`;
  const file = new File([Buffer.from(bytes)], `page-${pageNumber}.png`, {
    type: "image/png",
  });

  const { data, error } = await insforge.storage
    .from(TEST_UPLOADS_BUCKET)
    .upload(objectPath, file);

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Snapshot upload returned no object.");
  }

  return data.key;
}

export async function createProblemSourceImage({
  uploadId,
  uploadBytes,
  uploadFilename,
  uploadStorageKey,
  sourcePage,
}: {
  uploadId: string;
  uploadBytes: Uint8Array;
  uploadFilename: string;
  uploadStorageKey: string;
  sourcePage: number | null;
}) {
  const mimeType = resolveUploadMimeType({
    displayName: uploadFilename,
    storageKey: uploadStorageKey,
    bytes: uploadBytes,
  });

  if (mimeType === "application/pdf") {
    if (!sourcePage || sourcePage < 1) {
      return null;
    }

    const pngBytes = await renderPdfPageToPng(uploadBytes, sourcePage);
    return uploadSnapshotBytes({
      bytes: pngBytes,
      uploadId,
      pageNumber: sourcePage,
    });
  }

  if (
    mimeType === "image/png" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/webp"
  ) {
    return uploadStorageKey;
  }

  return null;
}
