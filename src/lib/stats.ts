import { prisma } from "@/lib/prisma";
import {
  MONTH_REGEX,
  currentMonthString,
  shiftMonth,
  monthRange,
  buildMonthWeeks,
} from "@/lib/date";

export { MONTH_REGEX, currentMonthString, shiftMonth };

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type CategoryBreakdownItem = {
  categoryId: string;
  name: string;
  color: string | null;
  icon: string | null;
  amount: number;
  percentage: number;
};

export type BudgetCategoryItem = {
  categoryId: string;
  name: string;
  amount: number;
  spent: number;
  remaining: number;
  /** amount가 0인데 spent > 0이면 Number.POSITIVE_INFINITY (무한대 초과). */
  percentage: number;
};

export type TrendPoint = { month: string; total: number };

export type MonthlyStats = {
  month: string;
  totalAmount: number;
  previousMonthAmount: number;
  /** 고정지출(RecurringExpense)에서 자동 생성된 지출의 합계 */
  fixedAmount: number;
  /** totalAmount - fixedAmount */
  variableAmount: number;
  categoryBreakdown: CategoryBreakdownItem[];
  budget: {
    overall: {
      amount: number;
      spent: number;
      remaining: number;
      percentage: number;
    } | null;
    categories: BudgetCategoryItem[];
  };
  trend: TrendPoint[];
  /** 지금까지 한 번이라도 지출이 등록된 적이 있는지 (전역 빈 상태 판단용) */
  hasAnyExpenseEver: boolean;
};

/** amount가 0이면 spent > 0일 때 무한대(항상 초과)로, spent도 0이면 0으로 취급한다. */
function budgetPercentage(spent: number, amount: number): number {
  if (amount > 0) return round1((spent / amount) * 100);
  return spent > 0 ? Number.POSITIVE_INFINITY : 0;
}

/** 지정한 월의 카테고리별 지출·예산 사용률과 최근 trendMonths개월 지출 추이를 계산한다. */
export async function getMonthlyStats(
  month: string,
  trendMonths = 6,
): Promise<MonthlyStats> {
  const { start, end } = monthRange(month);

  const [expenses, budgets, anyExpense] = await Promise.all([
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      include: { category: true },
    }),
    prisma.budget.findMany({
      where: { month },
      include: { category: true },
    }),
    prisma.expense.findFirst({ select: { id: true } }),
  ]);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const fixedAmount = expenses.reduce(
    (sum, e) => sum + (e.recurringExpenseId ? e.amount : 0),
    0,
  );

  const byCategory = new Map<string, CategoryBreakdownItem>();
  for (const expense of expenses) {
    const existing = byCategory.get(expense.categoryId);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      byCategory.set(expense.categoryId, {
        categoryId: expense.categoryId,
        name: expense.category.name,
        color: expense.category.color,
        icon: expense.category.icon,
        amount: expense.amount,
        percentage: 0,
      });
    }
  }

  const categoryBreakdown = [...byCategory.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({
      ...c,
      percentage: totalAmount > 0 ? round1((c.amount / totalAmount) * 100) : 0,
    }));

  const overallBudget = budgets.find((b) => b.categoryId === null) ?? null;
  const categoryBudgets = budgets.filter((b) => b.categoryId !== null);

  const budget = {
    overall: overallBudget
      ? {
          amount: overallBudget.amount,
          spent: totalAmount,
          remaining: overallBudget.amount - totalAmount,
          percentage: budgetPercentage(totalAmount, overallBudget.amount),
        }
      : null,
    categories: categoryBudgets
      .map((b) => {
        const spent = byCategory.get(b.categoryId as string)?.amount ?? 0;
        return {
          categoryId: b.categoryId as string,
          name: b.category?.name ?? "",
          amount: b.amount,
          spent,
          remaining: b.amount - spent,
          percentage: budgetPercentage(spent, b.amount),
        };
      })
      .sort((a, b) => b.percentage - a.percentage),
  };

  // 6개월치 추이를 달마다 따로 집계 쿼리를 날리는 대신, 전체 구간을 한 번에
  // 조회해 JS에서 월별로 합산한다 (쿼리 trendMonths번 -> 1번).
  const trendTargets = Array.from({ length: trendMonths }, (_, i) =>
    shiftMonth(month, -(trendMonths - 1 - i)),
  );
  const trendStart = monthRange(trendTargets[0]).start;
  const trendRows = await prisma.expense.findMany({
    where: { date: { gte: trendStart, lt: end } },
    select: { amount: true, date: true },
  });
  const trendTotals = new Map<string, number>();
  for (const row of trendRows) {
    const key = `${row.date.getUTCFullYear()}-${String(row.date.getUTCMonth() + 1).padStart(2, "0")}`;
    trendTotals.set(key, (trendTotals.get(key) ?? 0) + row.amount);
  }
  const trend: TrendPoint[] = trendTargets.map((m) => ({
    month: m,
    total: trendTotals.get(m) ?? 0,
  }));

  const previousMonthAmount = trendTotals.get(shiftMonth(month, -1)) ?? 0;

  return {
    month,
    totalAmount,
    previousMonthAmount,
    fixedAmount,
    variableAmount: totalAmount - fixedAmount,
    categoryBreakdown,
    budget,
    trend,
    hasAnyExpenseEver: anyExpense !== null,
  };
}

/**
 * 지정한 달의 날짜별 지출 합계를, 일요일 시작 주 단위 그리드(홈 화면 달력과
 * 같은 레이아웃)로 반환한다. 달력에 없는 칸은 null, 실제 날짜인데 지출이
 * 없으면 0.
 */
export async function getDailyHeatmapWeeks(
  month: string,
): Promise<(number | null)[][]> {
  const [year, mon] = month.split("-").map(Number);
  const weeks = buildMonthWeeks(year, mon - 1);

  const { start, end } = monthRange(month);
  const rows = await prisma.expense.findMany({
    where: { date: { gte: start, lt: end } },
    select: { amount: true, date: true },
  });

  const dailyTotals = new Map<number, number>();
  for (const row of rows) {
    const day = row.date.getUTCDate();
    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + row.amount);
  }

  return weeks.map((week) =>
    week.map((day) => (day === null ? null : (dailyTotals.get(day) ?? 0))),
  );
}
