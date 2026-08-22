import Link from "next/link";

/** 리포트 마크다운에서 "## 이번 달 요약" 섹션 본문만 뽑아 평문으로 만든다. */
function extractSummarySection(markdown: string): string | null {
  const lines = markdown.split("\n");
  const startIdx = lines.findIndex((l) => l.trim() === "## 이번 달 요약");
  if (startIdx === -1) return null;

  const rest = lines.slice(startIdx + 1);
  const endIdx = rest.findIndex((l) => l.trim().startsWith("## "));
  const sectionLines = endIdx === -1 ? rest : rest.slice(0, endIdx);

  const text = sectionLines
    .join(" ")
    .replace(/[*_`#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return text || null;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function CloudMascot() {
  return (
    <svg
      width="56"
      height="42"
      viewBox="0 0 72 52"
      fill="none"
      aria-hidden="true"
      className="shrink-0 drop-shadow-sm"
    >
      <ellipse cx="36" cy="34" rx="34" ry="16" fill="white" />
      <circle cx="20" cy="24" r="14" fill="white" />
      <circle cx="38" cy="16" r="17" fill="white" />
      <circle cx="56" cy="26" r="13" fill="white" />
      <circle cx="27" cy="33" r="2.4" fill="#2b4a6f" />
      <circle cx="45" cy="33" r="2.4" fill="#2b4a6f" />
      <path
        d="M30 38 Q36 43 42 38"
        stroke="#2b4a6f"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** 이번 달 리포트 요약을 구름 캐릭터가 말풍선으로 짧게 전해주는 위젯. */
export function AiTeaser({ reportContent }: { reportContent: string | null }) {
  const summary = reportContent ? extractSummarySection(reportContent) : null;
  const message = summary
    ? truncate(summary, 90)
    : "아직 이 달 리포트가 없어요. 만들어볼까요?";

  return (
    <div className="flex items-end gap-2">
      <CloudMascot />
      <span
        aria-hidden="true"
        className="mb-1 h-2 w-2 rounded-full bg-white/70 dark:bg-white/15"
      />
      <span
        aria-hidden="true"
        className="mb-2.5 h-1.5 w-1.5 rounded-full bg-white/70 dark:bg-white/15"
      />
      <div
        className="max-w-xs rounded-2xl bg-white/70 px-4 py-2.5 text-sm shadow-sm dark:bg-white/10"
        style={{ color: "var(--dv-text-primary)" }}
      >
        <p>{message}</p>
        {!summary && (
          <Link
            href="/reports"
            className="mt-1 inline-block font-medium text-sky-600 hover:underline dark:text-indigo-200"
          >
            AI 리포트 만들러 가기 →
          </Link>
        )}
      </div>
    </div>
  );
}
