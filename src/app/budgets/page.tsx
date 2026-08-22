import { prisma } from "@/lib/prisma";
import { MONTH_REGEX, currentMonthString } from "@/lib/date";
import { BudgetManager } from "./budget-manager";

type BudgetsPageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const { month: monthParam } = await searchParams;
  const month =
    monthParam && MONTH_REGEX.test(monthParam)
      ? monthParam
      : currentMonthString();

  const [categories, budgets] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.budget.findMany({
      where: { month },
      include: { category: true },
      orderBy: [{ categoryId: { sort: "asc", nulls: "first" } }],
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">예산</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        월별 전체 예산과 카테고리별 예산을 설정하고 확인할 수 있습니다.
      </p>
      <BudgetManager month={month} categories={categories} budgets={budgets} />
    </main>
  );
}
