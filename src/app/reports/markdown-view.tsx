import type { ReactNode } from "react";

// Minimal, dependency-free renderer for the small subset of markdown the AI
// report prompt is instructed to produce: "##"/"###" headings, "-"/"*"
// bullet lists, "**bold**" spans, and plain paragraphs. Intentionally not a
// full markdown parser — just enough to display the report nicely without
// pulling in a new npm dependency for this one screen.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((part) => part.length > 0);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

export function MarkdownView({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    const key = `list-${listKey++}`;
    blocks.push(
      <ul key={key} className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
        {listItems.map((item, i) => (
          <li key={`${key}-li-${i}`}>{renderInline(item, `${key}-li-${i}`)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2));
      return;
    }
    flushList();

    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h3 key={idx} className="mt-4 text-base font-semibold">
          {renderInline(trimmed.slice(4), `h3-${idx}`)}
        </h3>,
      );
    } else if (trimmed.startsWith("## ")) {
      blocks.push(
        <h2 key={idx} className="mt-6 text-lg font-semibold first:mt-0">
          {renderInline(trimmed.slice(3), `h2-${idx}`)}
        </h2>,
      );
    } else if (trimmed.startsWith("# ")) {
      blocks.push(
        <h1 key={idx} className="mt-6 text-xl font-semibold first:mt-0">
          {renderInline(trimmed.slice(2), `h1-${idx}`)}
        </h1>,
      );
    } else if (trimmed.length === 0) {
      // Blank lines only add spacing, handled via block margins above/below.
    } else {
      blocks.push(
        <p key={idx} className="mt-2 text-sm leading-relaxed">
          {renderInline(trimmed, `p-${idx}`)}
        </p>,
      );
    }
  });

  flushList();

  return <div>{blocks}</div>;
}
