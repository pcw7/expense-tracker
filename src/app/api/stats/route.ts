import { NextResponse } from "next/server";
import { MONTH_REGEX, currentMonthString, getMonthlyStats } from "@/lib/stats";

// GET /api/stats?month=YYYY-MM - 해당 월의 카테고리별 지출 합계, 총 지출, 예산 대비
// 사용률, 최근 6개월 지출 추이를 반환한다 (month 미지정 시 이번 달 기준).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const month = monthParam ?? currentMonthString();

  if (!MONTH_REGEX.test(month)) {
    return NextResponse.json(
      { error: "month 쿼리 파라미터는 YYYY-MM 형식이어야 합니다." },
      { status: 400 },
    );
  }

  const stats = await getMonthlyStats(month);

  return NextResponse.json(stats);
}
