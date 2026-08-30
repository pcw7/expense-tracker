// 고정지출(RecurringExpense) 자동 기록 로직. 이 앱은 상시 실행되는 서버가
// 없는 개인용 로컬 앱이라 별도 cron 대신, 페이지가 렌더링될 때마다(루트
// 레이아웃에서 호출) "이번 달 몫이 아직 없으면 생성" 하는 지연 생성 방식을 쓴다.
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/date";
import { isPrismaUniqueConflict } from "@/lib/api-response";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function daysInMonth(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

/**
 * 활성 상태인 고정지출 중 지정한 달에 아직 지출 내역이 생성되지 않은 항목을
 * 찾아 생성한다. dayOfMonth가 그 달에 없는 날짜(예: 2월 31일)면 말일로 보정한다.
 * 이미 생성된 항목은 건드리지 않아, 사용자가 금액/메모를 수정해도 유지된다.
 */
export async function ensureRecurringExpensesForMonth(
  month: string,
): Promise<void> {
  const active = await prisma.recurringExpense.findMany({
    where: { active: true },
  });
  if (active.length === 0) return;

  const { start, end } = monthRange(month);
  const existing = await prisma.expense.findMany({
    where: {
      recurringExpenseId: { in: active.map((r) => r.id) },
      date: { gte: start, lt: end },
    },
    select: { recurringExpenseId: true },
  });
  const already = new Set(existing.map((e) => e.recurringExpenseId));
  const toCreate = active.filter((r) => !already.has(r.id));
  if (toCreate.length === 0) return;

  // SQLite용 Prisma 클라이언트는 createMany의 skipDuplicates를 지원하지 않아서
  // 건 하나씩 생성한다. 동시 요청으로 findMany 이후 다른 요청이 먼저 생성했더라도,
  // DB의 (recurringExpenseId, date) unique 제약이 막아주므로 그 경우만 조용히 넘어간다.
  const lastDay = daysInMonth(month);
  await Promise.all(
    toCreate.map(async (r) => {
      try {
        await prisma.expense.create({
          data: {
            amount: r.amount,
            date: new Date(`${month}-${pad2(Math.min(r.dayOfMonth, lastDay))}T00:00:00.000Z`),
            memo: r.name,
            categoryId: r.categoryId,
            recurringExpenseId: r.id,
          },
        });
      } catch (error) {
        if (!isPrismaUniqueConflict(error)) throw error;
      }
    }),
  );
}
