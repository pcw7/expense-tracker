import type { CategoryBreakdownItem } from "@/lib/stats";
import { formatKRW } from "@/lib/format";
import {
  CATEGORY_SERIES_VARS,
  CATEGORY_OTHER_COLOR,
  resolveCategoryColor,
} from "@/lib/categoryColor";

const MAX_SLICES = CATEGORY_SERIES_VARS.length;
const SIZE = 160;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;

type Slice = {
  key: string;
  name: string;
  icon: string | null;
  amount: number;
  percentage: number;
  color: string;
};

/**
 * 이번 달 카테고리별 지출 비중을 보여주는 도넛 차트.
 * 가운데에 총 지출액을 표기하고, 옆에 카테고리별 금액/비중을 직접 라벨링해
 * 각도만으로 값을 추측하지 않아도 되게 한다. 상위 7개 초과분은 "기타"로 묶는다.
 */
export function DonutChart({
  items,
  total,
}: {
  items: CategoryBreakdownItem[];
  total: number;
}) {
  const shown = items.slice(0, MAX_SLICES);
  const rest = items.slice(MAX_SLICES);
  const otherAmount = rest.reduce((sum, c) => sum + c.amount, 0);
  const otherPercentage = rest.reduce((sum, c) => sum + c.percentage, 0);

  const slices: Slice[] = shown.map((item, i) => ({
    key: item.categoryId,
    name: item.name,
    icon: item.icon,
    amount: item.amount,
    percentage: item.percentage,
    color: resolveCategoryColor(item.color, i),
  }));

  if (otherAmount > 0) {
    slices.push({
      key: "__other__",
      name: "기타",
      icon: null,
      amount: otherAmount,
      percentage: Math.round(otherPercentage * 10) / 10,
      color: CATEGORY_OTHER_COLOR,
    });
  }

  if (slices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--dv-track)"
            strokeWidth={STROKE}
          />
        </svg>
        <p className="text-sm" style={{ color: "var(--dv-text-muted)" }}>
          아직 지출 내역이 없어요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--dv-track)"
            strokeWidth={STROKE}
          />
          {slices.map((slice, i) => {
            const precedingTotal = slices
              .slice(0, i)
              .reduce((sum, s) => sum + s.percentage, 0);
            return (
              <circle
                key={slice.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE}
                pathLength={100}
                strokeDasharray={`${slice.percentage} ${100 - slice.percentage}`}
                strokeDashoffset={-precedingTotal}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-4 text-center">
          <span className="text-xs" style={{ color: "var(--dv-text-muted)" }}>
            총 지출
          </span>
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: "var(--dv-text-primary)" }}
          >
            {formatKRW(total)}
          </span>
        </div>
      </div>
      <ul className="flex w-full max-w-xs flex-col gap-2">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2 text-sm">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span
                className="truncate"
                style={{ color: "var(--dv-text-primary)" }}
              >
                {slice.icon ? `${slice.icon} ` : ""}
                {slice.name}
              </span>
            </span>
            <span
              className="shrink-0 min-w-[5.5rem] text-right tabular-nums"
              style={{ color: "var(--dv-text-secondary)" }}
            >
              {formatKRW(slice.amount)}
            </span>
            <span
              className="shrink-0 min-w-[3.25rem] text-right tabular-nums"
              style={{ color: "var(--dv-text-muted)" }}
            >
              {slice.percentage.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
