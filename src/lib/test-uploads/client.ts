"use client";

import { getInsforgeClient } from "../insforge/client";
import type { TestUpload, UploadStatus } from "../types";

type TestUploadRow = {
  id: string;
  instructor_id: string | null;
  file_url: string;
  original_filename: string;
  status: UploadStatus;
  created_at: string | null;
};

function toTestUpload(row: TestUploadRow): TestUpload {
  return {
    id: row.id,
    instructorId: row.instructor_id,
    fileUrl: row.file_url,
    originalFilename: row.original_filename,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function createTestUpload({
  instructorId,
  filePathOrUrl,
  originalFilename,
}: {
  instructorId: string;
  filePathOrUrl: string;
  originalFilename: string;
}) {
  const insforge = getInsforgeClient();

  const { data, error } = await insforge.database
    .from("test_uploads")
    .insert({
      instructor_id: instructorId,
      // TODO: rename file_url to file_path when schema evolves; we store the
      // storage key here because it is the durable reference for private files.
      file_url: filePathOrUrl,
      original_filename: originalFilename,
      status: "uploaded",
    })
    .select("id, instructor_id, file_url, original_filename, status, created_at")
    .single<TestUploadRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Creating the test upload row returned no data.");
  }

  return toTestUpload(data);
}

export async function listInstructorTestUploads(instructorId: string) {
  const insforge = getInsforgeClient();

  const { data, error } = await insforge.database
    .from("test_uploads")
    .select("id, instructor_id, file_url, original_filename, status, created_at")
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toTestUpload(row as TestUploadRow));
}
