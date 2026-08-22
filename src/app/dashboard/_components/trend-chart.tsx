import type { TrendPoint } from "@/lib/stats";
import { formatKRW, formatMonthLabel, formatMonthShort } from "../_lib/format";

const VB_W = 640;
const VB_H = 220;
const MARGIN_X = 16;
const MARGIN_Y = 14;
const PLOT_W = VB_W - MARGIN_X * 2;
const PLOT_H = VB_H - MARGIN_Y * 2;

/** 데이터 최댓값보다 살짝 큰 "깔끔한" 상한값(1/2/5/10 × 10ⁿ)을 구한다. */
function niceMax(max: number): number {
  if (max <= 0) return 10000;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * 최근 N개월 총 지출 추이를 보여주는 단일 계열 라인+영역 차트.
 * viewBox와 컨테이너 종횡비를 일치시켜 균일하게 스케일되도록 하고(마크 왜곡 방지),
 * 축/눈금 라벨은 SVG 밖 일반 HTML 텍스트로 그려 작은 화면에서도 읽히게 한다.
 * 각 지점은 hover/focus로 툴팁을 여는 히트 영역을 가진다(단일 계열이라 범례는 생략).
 */
export function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const values = trend.map((t) => t.total);
  const max = niceMax(Math.max(...values, 0));
  const n = trend.length;

  const x = (i: number) => MARGIN_X + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const y = (v: number) => MARGIN_Y + (1 - v / max) * PLOT_H;

  const points = trend.map((t, i) => ({ ...t, x: x(i), y: y(t.total) }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const baseline = y(0);
  const areaPath =
    points.length > 0
      ? `M${points[0].x},${baseline} ` +
        points.map((p) => `L${p.x},${p.y}`).join(" ") +
        ` L${points[points.length - 1].x},${baseline} Z`
      : "";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-3">
        <div
          className="flex w-14 shrink-0 flex-col justify-between py-0.5 text-right text-xs tabular-nums"
          style={{ color: "var(--dv-text-muted)" }}
        >
          <span>{formatKRW(max)}</span>
          <span>{formatKRW(Math.round(max / 2))}</span>
          <span>0원</span>
        </div>
        <div
          className="relative flex-1"
          style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
        >
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <line
              x1={MARGIN_X}
              x2={VB_W - MARGIN_X}
              y1={y(max)}
              y2={y(max)}
              stroke="var(--dv-grid)"
              strokeWidth={1}
            />
            <line
              x1={MARGIN_X}
              x2={VB_W - MARGIN_X}
              y1={y(max / 2)}
              y2={y(max / 2)}
              stroke="var(--dv-grid)"
              strokeWidth={1}
            />
            <line
              x1={MARGIN_X}
              x2={VB_W - MARGIN_X}
              y1={baseline}
              y2={baseline}
              stroke="var(--dv-axis)"
              strokeWidth={1}
            />
            {areaPath && <path d={areaPath} fill="var(--dv-area-fill)" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="var(--dv-series-1)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {points.map((p, i) => {
              const isLast = i === points.length - 1;
              return (
                <circle
                  key={p.month}
                  cx={p.x}
                  cy={p.y}
                  r={isLast ? 6.5 : 4.5}
                  fill="var(--dv-series-1)"
                  stroke="var(--dv-surface)"
                  strokeWidth={2.5}
                />
              );
            })}
          </svg>

          {points.map((p) => (
            <div
              key={p.month}
              className="group/pt absolute"
              style={{
                left: `${(p.x / VB_W) * 100}%`,
                top: `${(p.y / VB_H) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <button
                type="button"
                aria-label={`${formatMonthLabel(p.month)} 지출 ${formatKRW(p.total)}`}
                className="block h-6 w-6 -m-3 rounded-full focus:outline-none"
              />
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs opacity-0 shadow-md transition-opacity group-hover/pt:opacity-100 group-focus-within/pt:opacity-100"
                style={{
                  backgroundColor: "var(--dv-text-primary)",
                  color: "var(--dv-surface)",
                }}
              >
                <strong className="tabular-nums">{formatKRW(p.total)}</strong>
                <span className="ml-1 opacity-75">
                  {formatMonthLabel(p.month)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        className="flex justify-between pl-[68px] text-xs"
        style={{ color: "var(--dv-text-muted)" }}
      >
        {trend.map((p) => (
          <span key={p.month}>{formatMonthShort(p.month)}</span>
        ))}
      </div>
    </div>
  );
}
