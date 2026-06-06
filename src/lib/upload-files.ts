export type StoredUploadFile = {
  storageKey: string;
  originalFilename: string;
};

function parseJsonArray(value: string) {
  const trimmed = value.trim();

  if (!trimmed.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parseStoredUploadFiles(
  rawValue: string | null | undefined,
  fallbackFilename: string | null | undefined,
): StoredUploadFile[] {
  const normalizedValue = rawValue?.trim() ?? "";
  const normalizedFallbackFilename = fallbackFilename?.trim() ?? "Uploaded file";

  if (normalizedValue === "") {
    return [];
  }

  const parsedArray = parseJsonArray(normalizedValue);

  if (!parsedArray) {
    return [
      {
        storageKey: normalizedValue,
        originalFilename: normalizedFallbackFilename,
      },
    ];
  }

  const files = parsedArray
    .map((item) => {
      if (typeof item === "string") {
        return {
          storageKey: item.trim(),
          originalFilename: normalizedFallbackFilename,
        };
      }

      if (
        item &&
        typeof item === "object" &&
        "storageKey" in item &&
        typeof item.storageKey === "string"
      ) {
        return {
          storageKey: item.storageKey.trim(),
          originalFilename:
            "originalFilename" in item && typeof item.originalFilename === "string"
              ? item.originalFilename.trim() || normalizedFallbackFilename
              : normalizedFallbackFilename,
        };
      }

      return null;
    })
    .filter((item): item is StoredUploadFile => item !== null && item.storageKey !== "");

  return files.length > 0
    ? files
    : [
        {
          storageKey: normalizedValue,
          originalFilename: normalizedFallbackFilename,
        },
      ];
}

export function serializeStoredUploadFiles(files: StoredUploadFile[]) {
  return JSON.stringify(
    files.map((file) => ({
      storageKey: file.storageKey,
      originalFilename: file.originalFilename,
    })),
  );
}

export function parseStoredStringList(rawValue: string | null | undefined) {
  const normalizedValue = rawValue?.trim() ?? "";

  if (normalizedValue === "") {
    return [] as string[];
  }

  const parsedArray = parseJsonArray(normalizedValue);

  if (!parsedArray) {
    return [normalizedValue];
  }

  return parsedArray
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item !== "");
}

export function serializeStoredStringList(values: string[]) {
  const normalizedValues = values.map((value) => value.trim()).filter((value) => value !== "");

  if (normalizedValues.length === 0) {
    return null;
  }

  return JSON.stringify(normalizedValues);
}

export function buildDefaultUploadLabel(sourceFilenames: string[]) {
  const normalizedNames = sourceFilenames.map((name) => name.trim()).filter((name) => name !== "");

  if (normalizedNames.length === 0) {
    return "Uploaded file";
  }

  if (normalizedNames.length === 1) {
    return normalizedNames[0];
  }

  return `${normalizedNames[0]} + ${normalizedNames.length - 1} more`;
}
