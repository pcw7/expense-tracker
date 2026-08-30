// 한국 공휴일(+대체공휴일) 계산. 음력 공휴일(설날/추석/부처님오신날)은
// korean-lunar-calendar(한국천문연구원 표 기반, 오프라인)로 변환하고, 대체공휴일은
// "토요일/일요일과 겹치거나 다른 공휴일과 겹치는 대상 공휴일은 그 다음 첫
// 비공휴일로 대체" 규정(관공서의 공휴일에 관한 규정 제3조)을 직접 계산한다.
// 설날·추석 연휴는 실제로는 "일요일과 겹칠 때만" 대체공휴일이 생기고(토요일은
// 트리거하지 않음 - 2025/2026년 실제 사례로 확인), 그 외 단일 공휴일(3·1절,
// 어린이날, 광복절, 개천절, 한글날, 부처님오신날)은 토·일요일 모두 트리거한다.
// 신정·현충일·성탄절과, 선거일 등으로 그때그때 지정되는 임시공휴일은 대상이 아니다.
import KoreanLunarCalendar from "korean-lunar-calendar";

type YMD = [number, number, number];
type SubstituteTrigger = "none" | "weekend" | "sunday";

const FIXED_HOLIDAYS: { month: number; day: number; name: string; trigger: SubstituteTrigger }[] = [
  { month: 1, day: 1, name: "신정", trigger: "none" },
  { month: 3, day: 1, name: "삼일절", trigger: "weekend" },
  { month: 5, day: 5, name: "어린이날", trigger: "weekend" },
  { month: 6, day: 6, name: "현충일", trigger: "none" },
  { month: 8, day: 15, name: "광복절", trigger: "weekend" },
  { month: 10, day: 3, name: "개천절", trigger: "weekend" },
  { month: 10, day: 9, name: "한글날", trigger: "weekend" },
  { month: 12, day: 25, name: "성탄절", trigger: "none" },
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toKey(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function addDays(y: number, m: number, d: number, delta: number): YMD {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
}

function weekdayOf(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일 ... 6=토
}

function lunarToSolar(year: number, lunarMonth: number, lunarDay: number): YMD | null {
  const cal = new KoreanLunarCalendar();
  if (!cal.setLunarDate(year, lunarMonth, lunarDay, false)) return null;
  const s = cal.getSolarCalendar();
  return [s.year, s.month, s.day];
}

/** 지정한 연도의 한국 공휴일(대체공휴일 포함)을 "YYYY-MM-DD" -> 이름 맵으로 반환한다. */
export function getKoreanHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();
  const substitutable: { key: string; trigger: SubstituteTrigger }[] = [];

  function add(y: number, m: number, d: number, name: string, trigger: SubstituteTrigger) {
    const key = toKey(y, m, d);
    if (!holidays.has(key)) holidays.set(key, name);
    if (trigger !== "none") substitutable.push({ key, trigger });
  }

  for (const h of FIXED_HOLIDAYS) add(year, h.month, h.day, h.name, h.trigger);

  const seollal = lunarToSolar(year, 1, 1);
  if (seollal) {
    const [y, m, d] = seollal;
    add(...addDays(y, m, d, -1), "설날 연휴", "sunday");
    add(y, m, d, "설날", "sunday");
    add(...addDays(y, m, d, 1), "설날 연휴", "sunday");
  }

  const chuseok = lunarToSolar(year, 8, 15);
  if (chuseok) {
    const [y, m, d] = chuseok;
    add(...addDays(y, m, d, -1), "추석 연휴", "sunday");
    add(y, m, d, "추석", "sunday");
    add(...addDays(y, m, d, 1), "추석 연휴", "sunday");
  }

  const buddha = lunarToSolar(year, 4, 8);
  if (buddha) add(...buddha, "부처님오신날", "weekend");

  // 대체공휴일: 트리거 조건(주말 전체 또는 일요일만)에 해당하거나, 다른 공휴일과
  // 겹치는 날짜마다, 겹치지 않는 첫 비공휴일 평일을 찾아 대체공휴일로 추가한다.
  const occurrences = new Map<string, number>();
  for (const { key } of substitutable) occurrences.set(key, (occurrences.get(key) ?? 0) + 1);

  const seen = new Set<string>();
  for (const { key, trigger } of substitutable) {
    if (seen.has(key)) continue;
    seen.add(key);

    const [y, m, d] = key.split("-").map(Number);
    const weekday = weekdayOf(y, m, d);
    const hitsTrigger = trigger === "sunday" ? weekday === 0 : weekday === 0 || weekday === 6;
    const overlapsAnotherHoliday = (occurrences.get(key) ?? 0) > 1;
    if (!hitsTrigger && !overlapsAnotherHoliday) continue;

    let [cy, cm, cd] = addDays(y, m, d, 1);
    while (weekdayOf(cy, cm, cd) === 0 || weekdayOf(cy, cm, cd) === 6 || holidays.has(toKey(cy, cm, cd))) {
      [cy, cm, cd] = addDays(cy, cm, cd, 1);
    }
    add(cy, cm, cd, "대체공휴일", "none");
  }

  return holidays;
}
