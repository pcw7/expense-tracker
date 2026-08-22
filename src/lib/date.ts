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
