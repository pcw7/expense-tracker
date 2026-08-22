import { prisma } from "@/lib/prisma";

export const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 현재 시각 기준 "YYYY-MM" 문자열을 반환한다. */
export function currentMonthString(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** month("YYYY-MM")에서 delta개월만큼 이동한 "YYYY-MM" 문자열을 반환한다. */
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, mon - 1, 1)),
    end: new Date(Date.UTC(year, mon, 1)),
  };
}

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
  percentage: number;
};

export type TrendPoint = { month: string; total: number };

export type MonthlyStats = {
  month: string;
  totalAmount: number;
  previousMonthAmount: number;
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

/** 지정한 월의 카테고리별 지출·예산 사용률과 최근 trendMonths개월 지출 추이를 계산한다. */
export async function getMonthlyStats(
  month: string,
  trendMonths = 6,
): Promise<MonthlyStats> {
  const { start, end } = getMonthRange(month);

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
          percentage:
            overallBudget.amount > 0
              ? round1((totalAmount / overallBudget.amount) * 100)
              : 0,
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
          percentage: b.amount > 0 ? round1((spent / b.amount) * 100) : 0,
        };
      })
      .sort((a, b) => b.percentage - a.percentage),
  };

  const trendTargets = Array.from({ length: trendMonths }, (_, i) =>
    shiftMonth(month, -(trendMonths - 1 - i)),
  );

  const trend = await Promise.all(
    trendTargets.map(async (m): Promise<TrendPoint> => {
      if (m === month) {
        return { month: m, total: totalAmount };
      }
      const { start: s, end: e } = getMonthRange(m);
      const agg = await prisma.expense.aggregate({
        where: { date: { gte: s, lt: e } },
        _sum: { amount: true },
      });
      return { month: m, total: agg._sum.amount ?? 0 };
    }),
  );

  const previousMonthAmount =
    trend.length >= 2 ? trend[trend.length - 2].total : 0;

  return {
    month,
    totalAmount,
    previousMonthAmount,
    categoryBreakdown,
    budget,
    trend,
    hasAnyExpenseEver: anyExpense !== null,
  };
}
