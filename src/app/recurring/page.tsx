import { prisma } from "@/lib/prisma";
import { RecurringManager } from "./recurring-manager";

export default async function RecurringPage() {
  const [categories, recurringExpenses] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.recurringExpense.findMany({
      include: { category: true },
      orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }],
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">고정지출</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        월세, 구독료처럼 매달 반복되는 지출을 등록해두면 매달 지정한 날짜에
        지출 내역이 자동으로 기록됩니다.
      </p>
      <RecurringManager categories={categories} recurringExpenses={recurringExpenses} />
    </main>
  );
}
