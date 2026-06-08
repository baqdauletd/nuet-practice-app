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
  // KaTeX logs noisy font-metric warnings for currency symbols such as "€".
  // Fall back to plain text instead of attempting math rendering in that case.
  if (/[\u20A0-\u20CF]/u.test(expression)) {
    return null;
  }

  try {
    return katex.renderToString(expression.trim(), {
      displayMode,
      output: "html",
      throwOnError: true,
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

  if (
    trimmed.includes("$") ||
    trimmed.includes("\\(") ||
    trimmed.includes("\\)") ||
    trimmed.includes("\\[") ||
    trimmed.includes("\\]")
  ) {
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

function DisplayMath({ expression }: { expression: string }) {
  const html = renderKatex(expression, true);

  if (!html) {
    return <span>{expression}</span>;
  }

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderBoldText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/gu);

  return parts.map((part, index) => {
    const isBold = /^\*\*[^*]+\*\*$/u.test(part);

    if (!isBold) {
      return <span key={`${index}-${part}`}>{part}</span>;
    }

    return <strong key={`${index}-${part}`}>{part.slice(2, -2)}</strong>;
  });
}

function renderInlineSegments(line: string) {
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
      return <span key={`${index}-${part}`}>{renderBoldText(part)}</span>;
    }

    const expression = stripMathDelimiters(part);
    const html = renderKatex(expression, false);

    if (!html) {
      return <span key={`${index}-${part}`}>{renderBoldText(part)}</span>;
    }

    return <InlineMath key={`${index}-${part}`} expression={expression} />;
  });
}

function renderLine(line: string) {
  const trimmed = line.trim();
  const hasExplicitMathDelimiters =
    trimmed.includes("$") ||
    trimmed.includes("\\(") ||
    trimmed.includes("\\)") ||
    trimmed.includes("\\[") ||
    trimmed.includes("\\]");

  if (!hasExplicitMathDelimiters && looksLikeStandaloneMath(trimmed)) {
    return (
      <span className="block overflow-x-auto py-1">
        <DisplayMath expression={trimmed} />
      </span>
    );
  }

  return renderInlineSegments(line);
}

function renderParagraphLines(paragraph: string) {
  const lines = paragraph.split("\n");

  return lines.map((line, index) => (
    <span key={`${index}-${line}`}>
      {renderLine(line)}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function renderParagraph(paragraph: string, index: number) {
  const lines = paragraph.split("\n");
  const listLines = lines.filter((line) => line.trim().startsWith("- "));

  if (lines.length > 0 && listLines.length === lines.length) {
    return (
      <ul key={`${index}-${paragraph.slice(0, 32)}`} className="grid gap-2 pl-5">
        {lines.map((line, lineIndex) => (
          <li key={`${lineIndex}-${line}`} className="break-words list-disc">
            {renderLine(line.trim().slice(2))}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p key={`${index}-${paragraph.slice(0, 32)}`} className="break-words">
      {renderParagraphLines(paragraph)}
    </p>
  );
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
      {paragraphs.map((paragraph, index) => renderParagraph(paragraph, index))}
    </div>
  );
}
