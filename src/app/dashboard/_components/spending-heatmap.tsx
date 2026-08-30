// "이번 달 날짜별 지출" 요일×주차 히트맵. TOAST UI Chart로 만들었다가, 셀에
// 마우스를 올렸을 때 라이브러리에 하드코딩된 어두운 그림자 효과(옵션으로 끌 수
// 없음 - 소스 확인함)가 우리 디자인과 안 맞아서, 순수 HTML/CSS 그리드 + CSS
// group-hover 툴팁(budget-meters.tsx와 같은 패턴)으로 직접 만들었다. 캔버스가
// 없으니 서버 컴포넌트로도 충분하다.
import { buildMonthWeeks } from "@/lib/date";
import { formatKRW } from "../_lib/format";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const GRID_HEIGHT = 220;

function colorMixPercent(amount: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((amount / max) * 100)));
}

export function SpendingHeatmap({
  month,
  weeks,
}: {
  month: string;
  weeks: (number | null)[][];
}) {
  const maxAmount = Math.max(0, ...weeks.flat().filter((v): v is number => v !== null));
  const [year, monthNum] = month.split("-").map(Number);
  const dayWeeks = buildMonthWeeks(year, monthNum - 1);

  // 1주가 화면 맨 아래에 오도록(달력을 위→아래로 읽는 방향과 반대) 순서를
  // 뒤집는다 - "지출 히트맵이면 아래가 1주차"라는 요청에 맞춘 것.
  const rows = weeks
    .map((week, i) => ({ weekLabel: `${i + 1}주`, week, days: dayWeeks[i] }))
    .reverse();

  return (
    <div className="flex items-stretch gap-4 rounded-2xl border border-sky-900/12 bg-[var(--dv-sequential-start)] p-4 dark:border-indigo-200/15">
      <div
        className="grid min-w-0 flex-1 gap-[3px]"
        style={{
          gridTemplateColumns: "2.25rem repeat(7, 1fr)",
          gridTemplateRows: `repeat(${rows.length}, 1fr) auto`,
          height: GRID_HEIGHT,
        }}
      >
        {rows.flatMap(({ weekLabel, week, days }, rowIndex) => [
          <div
            key={`label-${rowIndex}`}
            className="flex items-center justify-end pr-1 text-[11px]"
            style={{ color: "var(--dv-text-muted)" }}
          >
            {weekLabel}
          </div>,
          ...week.map((amount, dayIndex) => {
            const day = days[dayIndex];
            if (day === null) {
              return (
                <div
                  key={`empty-${rowIndex}-${dayIndex}`}
                  className="rounded-[4px]"
                  style={{ backgroundColor: "var(--dv-track)" }}
                />
              );
            }

            const percent = colorMixPercent(amount ?? 0, maxAmount);

            return (
              <div key={`cell-${rowIndex}-${dayIndex}`} className="group relative">
                <div
                  className="h-full w-full rounded-[4px] border-2 border-transparent transition-colors group-hover:border-[color-mix(in_srgb,var(--dv-text-primary)_35%,transparent)]"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--dv-sequential-end) ${percent}%, var(--dv-sequential-start))`,
                  }}
                />
                <div
                  className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                  style={{
                    backgroundColor: "var(--dv-text-primary)",
                    color: "var(--dv-surface)",
                  }}
                >
                  {monthNum}월 {day}일 {WEEKDAY_LABELS[dayIndex]}요일 ·{" "}
                  {formatKRW(amount ?? 0)}
                </div>
              </div>
            );
          }),
        ])}
        <div />
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="pt-1 text-center text-[11px]"
            style={{ color: "var(--dv-text-muted)" }}
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className="flex shrink-0 flex-col items-center justify-between text-xs"
        style={{ height: GRID_HEIGHT, color: "var(--dv-text-muted)" }}
      >
        <span className="tabular-nums">{formatKRW(maxAmount)}</span>
        <div
          aria-hidden="true"
          className="w-3 flex-1 rounded-full border border-black/10 dark:border-white/10"
          style={{
            background:
              "linear-gradient(to top, var(--dv-sequential-start), var(--dv-sequential-end))",
          }}
        />
        <span>0원</span>
      </div>
    </div>
  );
}
