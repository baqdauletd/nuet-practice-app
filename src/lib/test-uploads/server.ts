import "server-only";

import { TEST_UPLOADS_BUCKET } from "../constants";
import { getInsforgeServerClient } from "../insforge/server";
import type { TestUpload, UploadStatus } from "../types";
import { parseStoredUploadFiles } from "../upload-files";

type TestUploadRow = {
  id: string;
  instructor_id: string | null;
  file_url: string;
  original_filename: string;
  status: UploadStatus;
  created_at: string | null;
};

function toTestUpload(row: TestUploadRow): TestUpload {
  const sourceFiles = parseStoredUploadFiles(row.file_url, row.original_filename);

  return {
    id: row.id,
    instructorId: row.instructor_id,
    fileUrl: sourceFiles[0]?.storageKey ?? row.file_url,
    fileUrls: sourceFiles.map((file) => file.storageKey),
    originalFilename: row.original_filename,
    sourceFiles,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getTestUpload(uploadId: string) {
  const insforge = getInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("test_uploads")
    .select("id, instructor_id, file_url, original_filename, status, created_at")
    .eq("id", uploadId)
    .maybeSingle<TestUploadRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toTestUpload(data) : null;
}

export async function getOwnedTestUpload(
  uploadId: string,
  instructorId: string,
) {
  const upload = await getTestUpload(uploadId);

  if (!upload) {
    return null;
  }

  if (upload.instructorId !== instructorId) {
    return null;
  }

  return upload;
}

export async function updateTestUploadStatus(
  uploadId: string,
  status: UploadStatus,
) {
  const insforge = getInsforgeServerClient();
  const { error } = await insforge.database
    .from("test_uploads")
    .update({ status })
    .eq("id", uploadId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function downloadTestUploadFile(storageKey: string) {
  const insforge = getInsforgeServerClient();
  const { data, error } = await insforge.storage
    .from(TEST_UPLOADS_BUCKET)
    .download(storageKey);

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Storage download returned no file.");
  }

  const arrayBuffer = await data.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
