import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  shiftMonth,
  monthRange,
  localDateString,
  buildMonthWeeks,
} from "@/lib/date";
import { formatKRW } from "@/lib/format";
import { AddExpenseButton } from "./add-expense-modal";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateLabel(dateStr: string, isToday: boolean): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const label = `${m}/${d}`;
  return isToday ? `오늘(${label})` : label;
}

async function loadDailyExpenses(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return prisma.expense.findMany({
    where: { date: { gte: start, lt: end } },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 이번 달 달력 + 선택한 날짜의 지출 목록.
 * 달 이동/날짜 선택 모두 쿼리스트링(calMonth, date)으로 제어되는 링크라
 * 별도 클라이언트 상태 없이 서버 컴포넌트로 구현한다.
 */
export async function ExpenseCalendar({
  calMonth,
  dateParam,
}: {
  calMonth: string;
  dateParam: string | null;
}) {
  const [year, monthNum] = calMonth.split("-").map(Number);
  const weeks = buildMonthWeeks(year, monthNum - 1);
  const todayStr = localDateString();

  const selectedDate =
    dateParam && DATE_REGEX.test(dateParam) && dateParam.startsWith(calMonth)
      ? dateParam
      : todayStr.startsWith(calMonth)
        ? todayStr
        : null;

  const { start: monthStart, end: monthEnd } = monthRange(calMonth);

  const [monthExpenseDates, dailyExpenses, categories] = await Promise.all([
    prisma.expense.findMany({
      where: { date: { gte: monthStart, lt: monthEnd } },
      select: { date: true },
    }),
    selectedDate ? loadDailyExpenses(selectedDate) : Promise.resolve([]),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, icon: true },
    }),
  ]);
  const daysWithExpense = new Set(monthExpenseDates.map((e) => e.date.getUTCDate()));
  const dailyTotal = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const prevMonth = shiftMonth(calMonth, -1);
  const nextMonth = shiftMonth(calMonth, 1);

  return (
    <div className="dv-root flex flex-col gap-4 rounded-2xl border border-sky-900/12 bg-white/55 p-6 backdrop-blur-md dark:border-indigo-200/15 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <Link
          href={`/?calMonth=${prevMonth}`}
          aria-label="이전 달"
          className="rounded-md px-2 py-1 text-lg hover:bg-sky-500/10 dark:hover:bg-indigo-300/10"
        >
          ‹
        </Link>
        <span className="font-semibold" style={{ color: "var(--dv-text-primary)" }}>
          {year}년 {monthNum}월
        </span>
        <Link
          href={`/?calMonth=${nextMonth}`}
          aria-label="다음 달"
          className="rounded-md px-2 py-1 text-lg hover:bg-sky-500/10 dark:hover:bg-indigo-300/10"
        >
          ›
        </Link>
      </div>

      <table className="w-full table-fixed border-collapse text-center text-sm">
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((label, i) => (
              <th
                key={label}
                className="pb-2 font-normal"
                style={{
                  color:
                    i === 0
                      ? "var(--dv-delta-bad)"
                      : i === 6
                        ? "var(--dv-series-1)"
                        : "var(--dv-text-muted)",
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                if (day === null) return <td key={di} />;
                const dateStr = `${calMonth}-${pad2(day)}`;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const hasExpense = daysWithExpense.has(day);

                return (
                  <td key={di} className="py-1">
                    <Link
                      href={`/?calMonth=${calMonth}&date=${dateStr}`}
                      className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                        isSelected
                          ? "bg-teal-500 font-semibold text-white"
                          : isToday
                            ? "border border-teal-500 font-semibold"
                            : "hover:bg-sky-500/10 dark:hover:bg-indigo-300/10"
                      }`}
                      style={
                        !isSelected
                          ? { color: "var(--dv-text-primary)" }
                          : undefined
                      }
                    >
                      {day}
                      {hasExpense && !isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0.5 h-1 w-1 rounded-full"
                          style={{ backgroundColor: "var(--dv-series-1)" }}
                        />
                      )}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between">
        <Link
          href="/expenses"
          className="text-sm font-medium text-sky-600 hover:underline dark:text-indigo-200"
        >
          전체 보기
        </Link>
        <AddExpenseButton
          categories={categories}
          defaultDate={selectedDate ?? todayStr}
        />
      </div>

      {selectedDate && (
        <div className="flex flex-col gap-3 border-t border-sky-900/12 pt-4 dark:border-indigo-200/15">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold" style={{ color: "var(--dv-text-primary)" }}>
              {formatDateLabel(selectedDate, selectedDate === todayStr)}
            </h3>
            <span
              className="font-semibold tabular-nums"
              style={{ color: "var(--dv-text-primary)" }}
            >
              {formatKRW(dailyTotal)}
            </span>
          </div>
          {dailyExpenses.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--dv-text-muted)" }}>
              이 날은 지출이 없어요.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dailyExpenses.map((expense) => {
                const categoryColor = expense.category.color ?? "var(--dv-text-muted)";
                return (
                <li
                  key={expense.id}
                  className="flex items-center gap-4 rounded-xl border px-3 py-1.5"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${categoryColor} 16%, var(--dv-surface))`,
                    borderColor: `color-mix(in srgb, ${categoryColor} 35%, transparent)`,
                  }}
                >
                  <div className="flex w-14 shrink-0 flex-col items-center gap-0.5">
                    <span className="text-lg leading-none">
                      {expense.category.icon ?? "🏷️"}
                    </span>
                    <span
                      className="text-center text-[10px] leading-tight"
                      style={{ color: "var(--dv-text-muted)" }}
                    >
                      {expense.category.name}
                    </span>
                  </div>
                  {expense.memo ? (
                    <span
                      className="min-w-0 flex-1 truncate text-sm"
                      style={{ color: "var(--dv-text-primary)" }}
                    >
                      {expense.memo}
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1" />
                  )}
                  <span
                    className="shrink-0 text-sm font-medium tabular-nums"
                    style={{ color: "var(--dv-text-secondary)" }}
                  >
                    {formatKRW(expense.amount)}
                  </span>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
