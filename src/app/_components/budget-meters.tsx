import type { BudgetCategoryItem } from "@/lib/stats";
import { formatKRW } from "@/lib/format";

type MeterProps = {
  label: string;
  spent: number;
  amount: number;
  percentage: number;
};

/**
 * 예산 대비 사용률을 보여주는 단일 게이지(bar meter).
 * 채워진 막대 색상이 심각도를 나타낸다: 80% 미만 정상(accent) → 80~100% 경고 → 초과 위험.
 */
function Meter({ label, spent, amount, percentage }: MeterProps) {
  const isOver = !Number.isFinite(percentage) || percentage > 100;
  const filledWidth = Number.isFinite(percentage)
    ? Math.min(Math.max(percentage, 0), 100)
    : 100;
  const color = isOver
    ? "var(--dv-status-critical)"
    : percentage >= 80
      ? "var(--dv-status-warning)"
      : "var(--dv-series-1)";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span
          className="min-w-0 truncate font-medium"
          style={{ color: "var(--dv-text-primary)" }}
        >
          {label}
        </span>
        <span
          className="shrink-0 tabular-nums"
          style={{ color: "var(--dv-text-secondary)" }}
        >
          {formatKRW(spent)} / {formatKRW(amount)}
        </span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-[4px]"
        style={{ backgroundColor: "var(--dv-track)" }}
      >
        <div
          className="h-3 rounded-[4px]"
          style={{ width: `${filledWidth}%`, backgroundColor: color }}
        />
      </div>
      <div
        className="mt-1 text-xs tabular-nums"
        style={{ color: isOver ? "var(--dv-delta-bad)" : "var(--dv-text-muted)" }}
      >
        {Number.isFinite(percentage) ? `${percentage}% 사용` : "예산 0원, 지출 발생"}
        {isOver ? ` · ${formatKRW(spent - amount)} 초과` : ""}
      </div>
    </div>
  );
}

export function BudgetMeters({
  overall,
  categories,
}: {
  overall: {
    amount: number;
    spent: number;
    remaining: number;
    percentage: number;
  } | null;
  categories: BudgetCategoryItem[];
}) {
  return (
    <div className="flex flex-col gap-5">
      {overall && (
        <Meter
          label="전체 예산"
          spent={overall.spent}
          amount={overall.amount}
          percentage={overall.percentage}
        />
      )}
      {categories.length > 0 && (
        <div className="flex flex-col gap-4">
          {categories.map((c) => (
            <Meter
              key={c.categoryId}
              label={c.name}
              spent={c.spent}
              amount={c.amount}
              percentage={c.percentage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
