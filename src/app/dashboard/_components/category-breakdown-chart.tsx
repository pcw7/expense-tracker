import type { CategoryBreakdownItem } from "@/lib/stats";
import { formatKRW } from "../_lib/format";

const SERIES_VARS = [
  "var(--dv-series-1)",
  "var(--dv-series-2)",
  "var(--dv-series-3)",
  "var(--dv-series-4)",
  "var(--dv-series-5)",
  "var(--dv-series-6)",
  "var(--dv-series-7)",
];
const MAX_INDIVIDUAL_SERIES = SERIES_VARS.length;

type Row = {
  key: string;
  name: string;
  icon: string | null;
  amount: number;
  percentage: number;
  color: string;
};

/**
 * 카테고리별 지출을 금액 순으로 나열한 가로 막대 차트.
 * 막대 길이는 최댓값 대비 상대값이며, 각 항목에 이름·금액·비중을 직접 라벨로 표기해
 * 별도 범례 없이도 항목을 식별할 수 있게 한다. 상위 7개 초과분은 "기타"로 묶는다
 * (dataviz 스킬의 범주형 팔레트 8슬롯 상한 규칙).
 */
export function CategoryBreakdownChart({
  items,
}: {
  items: CategoryBreakdownItem[];
}) {
  const shown = items.slice(0, MAX_INDIVIDUAL_SERIES);
  const rest = items.slice(MAX_INDIVIDUAL_SERIES);
  const otherAmount = rest.reduce((sum, c) => sum + c.amount, 0);
  const otherPercentage = rest.reduce((sum, c) => sum + c.percentage, 0);

  const rows: Row[] = shown.map((item, i) => ({
    key: item.categoryId,
    name: item.name,
    icon: item.icon,
    amount: item.amount,
    percentage: item.percentage,
    color: SERIES_VARS[i],
  }));

  if (otherAmount > 0) {
    rows.push({
      key: "__other__",
      name: "기타",
      icon: null,
      amount: otherAmount,
      percentage: Math.round(otherPercentage * 10) / 10,
      color: "var(--dv-series-other)",
    });
  }

  const maxAmount = Math.max(...rows.map((r) => r.amount), 1);

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span
              className="flex min-w-0 items-center gap-1.5 font-medium"
              style={{ color: "var(--dv-text-primary)" }}
            >
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <span className="truncate">
                {row.icon ? `${row.icon} ` : ""}
                {row.name}
              </span>
            </span>
            <span
              className="shrink-0 tabular-nums"
              style={{ color: "var(--dv-text-secondary)" }}
            >
              {formatKRW(row.amount)}
              <span style={{ color: "var(--dv-text-muted)" }}>
                {" "}
                · {row.percentage}%
              </span>
            </span>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-[4px]"
            style={{ backgroundColor: "var(--dv-track)" }}
          >
            <div
              className="h-3 rounded-r-[4px]"
              style={{
                width: `${(row.amount / maxAmount) * 100}%`,
                backgroundColor: row.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
