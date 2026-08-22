export { formatKRW } from "@/lib/format";

/** "YYYY-MM" 문자열을 "2026년 8월" 형식으로 표기한다. */
export function formatMonthLabel(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  return `${year}년 ${mon}월`;
}

/** "YYYY-MM" 문자열을 "8월" 형식(짧은 축 라벨)으로 표기한다. */
export function formatMonthShort(month: string): string {
  const mon = Number(month.split("-")[1]);
  return `${mon}월`;
}
