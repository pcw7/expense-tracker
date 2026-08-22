import { formatKRW } from "../_lib/format";

/**
 * 대시보드의 히어로 수치: 이번 달 총 지출 + 전월 대비 증감.
 * 지출은 늘어나는 쪽이 "나쁜" 방향이므로 증가는 delta-bad, 감소는 delta-good로 표기한다.
 */
export function TotalSpendTile({
  total,
  previous,
}: {
  total: number;
  previous: number;
}) {
  const delta =
    previous > 0 ? Math.round(((total - previous) / previous) * 1000) / 10 : null;

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--dv-text-secondary)" }}>
        이번 달 총 지출
      </p>
      <p
        className="text-4xl font-semibold leading-tight sm:text-5xl"
        style={{ color: "var(--dv-text-primary)" }}
      >
        {formatKRW(total)}
      </p>
      {delta !== null && (
        <p
          className="mt-1 text-sm"
          style={{
            color:
              delta > 0
                ? "var(--dv-delta-bad)"
                : delta < 0
                  ? "var(--dv-delta-good)"
                  : "var(--dv-text-muted)",
          }}
        >
          전월 대비 {delta > 0 ? "+" : ""}
          {delta}% {delta > 0 ? "증가" : delta < 0 ? "감소" : "동일"}
        </p>
      )}
    </div>
  );
}
