import Link from "next/link";
import { MONTH_REGEX, currentMonthString, getMonthlyStats, shiftMonth } from "@/lib/stats";
import { BudgetMeters } from "../_components/budget-meters";
import { CategoryBreakdownChart } from "./_components/category-breakdown-chart";
import { EmptyState } from "../_components/empty-state";
import { TotalSpendTile } from "./_components/total-spend-tile";
import { TrendChart } from "./_components/trend-chart";
import { formatMonthLabel } from "./_lib/format";

function resolveMonth(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && MONTH_REGEX.test(value) ? value : currentMonthString();
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const searchParams = await props.searchParams;
  const month = resolveMonth(searchParams.month);

  const stats = await getMonthlyStats(month);
  const isCurrentMonth = month === currentMonthString();
  const prevMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  const hasThisMonthData = stats.categoryBreakdown.length > 0;
  const hasBudget =
    stats.budget.overall !== null || stats.budget.categories.length > 0;
  const hasAnyTrend = stats.trend.some((t) => t.total > 0);

  return (
    <main className="dv-root mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--dv-text-secondary)" }}
          >
            카테고리별·기간별 지출 통계를 확인하세요.
          </p>
        </div>

        {/* 조회 월 선택 - 차트 위 한 줄에 배치 */}
        <nav
          className="flex items-center gap-1 text-sm"
          aria-label="조회 월 선택"
        >
          <Link
            href={`/dashboard?month=${prevMonth}`}
            className="rounded-md px-2 py-1 transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            style={{ color: "var(--dv-text-secondary)" }}
          >
            ← 이전 달
          </Link>
          <span
            className="min-w-[7rem] px-1 text-center font-medium"
            style={{ color: "var(--dv-text-primary)" }}
          >
            {formatMonthLabel(month)}
          </span>
          {isCurrentMonth ? (
            <span
              aria-disabled
              className="cursor-not-allowed rounded-md px-2 py-1 opacity-40"
              style={{ color: "var(--dv-text-secondary)" }}
            >
              다음 달 →
            </span>
          ) : (
            <Link
              href={`/dashboard?month=${nextMonth}`}
              className="rounded-md px-2 py-1 transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              style={{ color: "var(--dv-text-secondary)" }}
            >
              다음 달 →
            </Link>
          )}
        </nav>
      </div>

      {!stats.hasAnyExpenseEver ? (
        <EmptyState
          title="아직 등록된 지출이 없습니다"
          description="지출을 기록하면 이곳에 카테고리별 통계, 예산 사용률, 월별 추이가 표시됩니다."
          actionHref="/expenses"
          actionLabel="지출 기록하러 가기 →"
        />
      ) : (
        <>
          <TotalSpendTile
            total={stats.totalAmount}
            previous={stats.previousMonthAmount}
          />

          <section className="flex flex-col gap-4">
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ color: "var(--dv-text-primary)" }}
            >
              카테고리별 지출
            </h2>
            {hasThisMonthData ? (
              <CategoryBreakdownChart items={stats.categoryBreakdown} />
            ) : (
              <EmptyState
                title="이번 달 지출 내역이 없습니다"
                description="선택한 달에 기록된 지출이 없어 카테고리별 통계를 표시할 수 없습니다."
              />
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ color: "var(--dv-text-primary)" }}
            >
              예산 대비 사용률
            </h2>
            {hasBudget ? (
              <BudgetMeters
                overall={stats.budget.overall}
                categories={stats.budget.categories}
              />
            ) : (
              <EmptyState
                title="설정된 예산이 없습니다"
                description="예산을 설정하면 이번 달 사용률을 한눈에 볼 수 있습니다."
                actionHref="/budgets"
                actionLabel="예산 설정하러 가기 →"
              />
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ color: "var(--dv-text-primary)" }}
            >
              최근 {stats.trend.length}개월 지출 추이
            </h2>
            {hasAnyTrend ? (
              <TrendChart trend={stats.trend} />
            ) : (
              <EmptyState
                title="최근 지출 추이가 없습니다"
                description="지출이 쌓이면 최근 몇 달간의 변화를 그래프로 보여드립니다."
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}
