"use client";

import Link from "next/link";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { ROUTES } from "../../lib/constants";
import { listInstructorTestUploads } from "../../lib/test-uploads/client";
import type {
  AppUserProfile,
  ExtractProblemsResponse,
  TestUpload,
} from "../../lib/types";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function validateFiles(files: File[]) {
  if (files.length === 0) {
    return "Select at least one file before uploading.";
  }

  for (const file of files) {
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return "Unsupported file type. Upload a PDF, PNG, JPEG, or WEBP file.";
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "File is too large. The limit is 20 MB.";
    }
  }

  return null;
}

export function InstructorUploadPanel({
  profile,
}: {
  profile: AppUserProfile;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<TestUpload[]>([]);
  const [isLoadingUploads, setIsLoadingUploads] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [extractingUploadId, setExtractingUploadId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugDetails, setDebugDetails] = useState<string | null>(null);
  const [extractedCounts, setExtractedCounts] = useState<Record<string, number>>({});

  const selectedFilename = useMemo(
    () =>
      selectedFiles.length > 0
        ? selectedFiles.map((file) => file.name).join(", ")
        : "No files selected",
    [selectedFiles],
  );

  useEffect(() => {
    let isActive = true;

    async function loadUploads() {
      try {
        const data = await listInstructorTestUploads(profile.id);
        if (isActive) {
          setUploads(data);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load recent uploads.";
        setErrorMessage(message);
      } finally {
        if (isActive) {
          setIsLoadingUploads(false);
        }
      }
    }

    void loadUploads();

    return () => {
      isActive = false;
    };
  }, [profile.id]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    setSuccessMessage(null);
    setDebugDetails(null);
    setErrorMessage(validateFiles(files));
  }

  async function refreshUploads() {
    const data = await listInstructorTestUploads(profile.id);
    setUploads(data);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateFiles(selectedFiles);
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      setDebugDetails(null);
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
      setDebugDetails(null);

    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("files", file);
      }
      formData.append("instructorId", profile.id);

      const response = await fetch("/api/instructor/upload-test", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        details?: string;
      };

      if (!response.ok || !payload.ok) {
        setErrorMessage(
          payload.message ? `Upload failed: ${payload.message}` : "Upload failed.",
        );

        if (process.env.NODE_ENV !== "production" && payload.details) {
          setDebugDetails(payload.details);
        }
        return;
      }

      await refreshUploads();
      setSelectedFiles([]);
      setSuccessMessage(
        selectedFiles.length === 1
          ? "File uploaded successfully."
          : "Files uploaded successfully as one problem set.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload the file.";
      setErrorMessage(`Upload failed: ${message}`);
      if (process.env.NODE_ENV !== "production") {
        setDebugDetails(message);
      }
    } finally {
      setIsUploading(false);
    }
  }

  async function handleExtractProblems(uploadId: string) {
    setExtractingUploadId(uploadId);
    setErrorMessage(null);
    setSuccessMessage(null);
    setDebugDetails(null);

    try {
      const response = await fetch("/api/extract-problems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uploadId, instructorId: profile.id }),
      });

      const payload = (await response.json()) as
        | ({ error?: string; details?: string } & Partial<ExtractProblemsResponse>)
        | ExtractProblemsResponse;

      if (!response.ok || typeof payload.count !== "number") {
        const message =
          "error" in payload && payload.error
            ? payload.error
            : "Problem extraction failed.";
        setErrorMessage(message);

        if (
          process.env.NODE_ENV !== "production" &&
          "details" in payload &&
          payload.details
        ) {
          setDebugDetails(payload.details);
        }
        return;
      }

      const count = payload.count;

      setExtractedCounts((current) => ({
        ...current,
        [uploadId]: count,
      }));
      await refreshUploads();
      setSuccessMessage(`Extracted ${count} Math problems.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Problem extraction failed.";
      setErrorMessage(message);
      if (process.env.NODE_ENV !== "production") {
        setDebugDetails(message);
      }
    } finally {
      setExtractingUploadId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-slate-950">
            Upload test files
          </h2>
        </div>

        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <label
              htmlFor="test-upload"
              className="block text-sm font-medium text-slate-700"
            >
              Select test files
            </label>
            <input
              id="test-upload"
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              multiple
              onChange={handleFileChange}
              className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
            />
            <p className="mt-3 text-sm text-slate-500">
              Selected files: {selectedFilename}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isUploading}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {isUploading ? "Uploading..." : "Upload problem set"}
            </button>
          </div>

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {process.env.NODE_ENV !== "production" && debugDetails ? (
            <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <summary className="cursor-pointer font-medium text-slate-900">
                Debug details
              </summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
                {debugDetails}
              </pre>
            </details>
          ) : null}
        </form>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Recent uploads
            </h2>
          </div>
        </div>

        {isLoadingUploads ? (
          <p className="mt-6 text-sm text-slate-600">Loading uploads...</p>
        ) : uploads.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">
            No uploaded files yet.
          </p>
        ) : (
          <div className="mt-6 grid gap-4">
            {uploads.map((upload) => (
              <article
                key={upload.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">
                      {upload.originalFilename}
                    </h3>
                    <div className="mt-2 grid gap-1 text-sm text-slate-600">
                      <p>
                        {upload.sourceFiles.length} source
                        {upload.sourceFiles.length === 1 ? " file" : " files"}
                      </p>
                      {upload.sourceFiles.map((file, fileIndex) => (
                        <p key={`${upload.id}-source-${fileIndex}`} className="break-all">
                          {file.originalFilename}
                        </p>
                      ))}
                    </div>
                    {typeof extractedCounts[upload.id] === "number" ? (
                      <p className="mt-1 text-sm text-emerald-700">
                        Extracted count: {extractedCounts[upload.id]}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold tracking-[0.16em] text-slate-600 uppercase">
                      {upload.status}
                    </span>
                    <Link
                      href={`${ROUTES.instructor}/uploads/${upload.id}`}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        upload.status === "extracted"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100"
                          : "border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      Review problems
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleExtractProblems(upload.id)}
                      disabled={
                        extractingUploadId === upload.id ||
                        !["uploaded", "failed"].includes(upload.status)
                      }
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {extractingUploadId === upload.id
                        ? "Extracting..."
                        : "Extract Math Problems"}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Uploaded: {formatDate(upload.createdAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
