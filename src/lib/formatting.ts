type FormattedContent =
  | {
      kind: "steps";
      items: string[];
    }
  | {
      kind: "paragraphs";
      items: string[];
    };

function normalizeText(input: string | null | undefined) {
  return (input ?? "").replace(/\r\n/g, "\n").trim();
}

function splitParagraphs(input: string) {
  return input
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function stripStepPrefix(line: string) {
  return cleanLine(line).replace(
    /^(?:step\s*\d+\s*[:.)-]?|\d+\s*[\].):-]?)\s*/i,
    "",
  );
}

function extractNumberedLines(input: string) {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const numberedLines = lines.filter((line) =>
    /^(?:step\s*\d+\s*[:.)-]?|\d+\s*[\].):-]?)\s+/i.test(line),
  );

  if (numberedLines.length < 2 || numberedLines.length !== lines.length) {
    return [];
  }

  return numberedLines.map(stripStepPrefix).filter(Boolean);
}

export function formatAiText(
  input: string | null | undefined,
): FormattedContent | null {
  const normalized = normalizeText(input);

  if (!normalized) {
    return null;
  }

  const steps = extractNumberedLines(normalized);
  if (steps.length) {
    return {
      kind: "steps",
      items: steps,
    };
  }

  return {
    kind: "paragraphs",
    items: splitParagraphs(normalized),
  };
}
