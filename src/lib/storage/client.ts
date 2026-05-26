"use client";

import { TEST_UPLOADS_BUCKET } from "../constants";
import { getInsforgeClient } from "../insforge/client";

function sanitizeFilename(filename: string) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function uploadInstructorTestFile({
  instructorId,
  file,
}: {
  instructorId: string;
  file: File;
}) {
  const safeFilename = sanitizeFilename(file.name) || "upload";
  const timestamp = Date.now();
  const objectPath = `instructor-tests/${instructorId}/${timestamp}-${safeFilename}`;

  const insforge = getInsforgeClient();
  const { data, error } = await insforge.storage
    .from(TEST_UPLOADS_BUCKET)
    .upload(objectPath, file);

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Upload did not return a storage object.");
  }

  return data;
}
