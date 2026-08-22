// Shared "YYYY-MM" month-string helpers used by stats, budgets, and the AI
// report pipeline. Centralized so "current month" is computed the same way
// everywhere (local time, matching what a user means by "this month").

export const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 로컬(서버) 시각 기준 "YYYY-MM" 문자열을 반환한다. */
export function currentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** month("YYYY-MM")에서 delta개월만큼 이동한 "YYYY-MM" 문자열을 반환한다. */
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * 로컬 달력 기준 날짜를 "YYYY-MM-DD" 문자열로 반환한다. Expense.date 컬럼은
 * 이 문자열이 그대로 UTC 자정으로 저장되므로, 로컬 자정 시각을 기준으로 변환해야
 * 사용자가 보는 "오늘"과 저장되는 날짜가 어긋나지 않는다.
 */
export function localDateString(date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}

/**
 * year/monthIndex0(0=1월)이 나타내는 달의 주 단위 달력 그리드를 만든다.
 * 일요일 시작, 앞뒤 빈 칸은 null (서버 달력과 모달 내 미니 달력이 공유).
 */
export function buildMonthWeeks(
  year: number,
  monthIndex0: number,
): (number | null)[][] {
  const startWeekday = new Date(Date.UTC(year, monthIndex0, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * month("YYYY-MM")가 나타내는 달의 [start, end) 구간을 반환한다.
 * Expense.date는 date-only 문자열("YYYY-MM-DD")이 UTC 자정으로 저장되므로,
 * 이 구간도 UTC 기준으로 계산해야 저장된 값과 정확히 맞물린다.
 */
export function monthRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, mon - 1, 1)),
    end: new Date(Date.UTC(year, mon, 1)),
  };
}
