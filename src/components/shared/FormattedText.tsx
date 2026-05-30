import katex from "katex";

function splitParagraphs(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function renderKatex(expression: string, displayMode: boolean) {
  try {
    return katex.renderToString(expression.trim(), {
      displayMode,
      output: "html",
      throwOnError: false,
      strict: "ignore",
      trust: false,
    });
  } catch {
    return null;
  }
}

function stripMathDelimiters(value: string) {
  return value
    .replace(/^\$\$/u, "")
    .replace(/\$\$$/u, "")
    .replace(/^\$/u, "")
    .replace(/\$$/u, "")
    .replace(/^\\\(/u, "")
    .replace(/\\\)$/u, "")
    .replace(/^\\\[/u, "")
    .replace(/\\\]$/u, "");
}

function looksLikeStandaloneMath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const withoutLatexText = trimmed.replace(/\\text\{[^}]*\}/gu, "");
  const hasLatexSyntax =
    /\\[a-zA-Z]+/u.test(trimmed) ||
    /[\^_=]/u.test(trimmed) ||
    /[{}]/u.test(trimmed) ||
    /[0-9]\s*[+\-*/=]\s*[0-9a-zA-Z(]/u.test(trimmed);
  const hasLongWords = /[a-zA-Z]{4,}/u.test(withoutLatexText);

  return hasLatexSyntax && !hasLongWords;
}

function InlineMath({
  expression,
}: {
  expression: string;
}) {
  const html = renderKatex(expression, false);

  if (!html) {
    return <span>{expression}</span>;
  }

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function DisplayMath({
  expression,
}: {
  expression: string;
}) {
  const html = renderKatex(expression, true);

  if (!html) {
    return <span>{expression}</span>;
  }

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderLine(line: string) {
  const trimmed = line.trim();

  if (looksLikeStandaloneMath(trimmed)) {
    return (
      <span className="block overflow-x-auto py-1">
        <DisplayMath expression={trimmed} />
      </span>
    );
  }

  const parts = line.split(
    /(\$\$[^$]+\$\$|\$[^$]+\$|\\\([^)]+\\\)|\\\[[\s\S]+?\\\])/gu,
  );

  return parts.map((part, index) => {
    const isMathToken =
      /^\$\$[^$]+\$\$$/u.test(part) ||
      /^\$[^$]+\$$/u.test(part) ||
      /^\\\([^)]+\\\)$/u.test(part) ||
      /^\\\[[\s\S]+\\\]$/u.test(part);

    if (!isMathToken) {
      return <span key={`${index}-${part}`}>{part}</span>;
    }

    const expression = stripMathDelimiters(part);
    return <InlineMath key={`${index}-${part}`} expression={expression} />;
  });
}

function renderParagraph(paragraph: string) {
  const lines = paragraph.split("\n");

  return lines.map((line, index) => (
    <span key={`${index}-${line}`}>
      {renderLine(line)}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

export function FormattedText({
  text,
  emptyText = "No content available.",
  className = "",
}: {
  text: string | null | undefined;
  emptyText?: string;
  className?: string;
}) {
  const content = (text ?? "").trim();

  if (!content) {
    return (
      <p className={`text-sm leading-7 text-slate-500 ${className}`.trim()}>
        {emptyText}
      </p>
    );
  }

  const paragraphs = splitParagraphs(content);

  return (
    <div className={`grid gap-3 text-sm leading-7 text-slate-700 ${className}`.trim()}>
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 32)}`} className="break-words">
          {renderParagraph(paragraph)}
        </p>
      ))}
    </div>
  );
}
