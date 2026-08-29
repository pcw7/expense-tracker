// Aggregates Expense data for a given "YYYY-MM" month and turns it into the
// prompt messages sent to OpenRouter for the monthly AI report.

import { prisma } from "@/lib/prisma";
import { shiftMonth, monthRange } from "@/lib/date";
import { formatKRW } from "@/lib/format";
import type { ChatMessage } from "@/lib/openrouter";

export { MONTH_REGEX } from "@/lib/date";

export type CategoryBreakdown = {
  name: string;
  amount: number;
  count: number;
  /** Share of the month's total spend, as a percentage rounded to 1 decimal. */
  ratio: number;
};

export type MonthlySummary = {
  month: string;
  total: number;
  count: number;
  categories: CategoryBreakdown[];
  previousMonth: string;
  previousTotal: number;
  /** total - previousTotal (positive = spent more than last month). */
  diff: number;
  /** Percent change vs previous month, or null if previous month had no spend. */
  diffRatio: number | null;
};

type MonthTotals = {
  total: number;
  categoryTotals: Map<string, { amount: number; count: number }>;
};

/**
 * DB 레벨 집계(aggregate/groupBy)로 월별 합계와 카테고리별 합계를 구한다.
 * 전체 row를 category join과 함께 가져와 JS에서 reduce하는 대신, 필요한
 * 합계만 DB에서 계산해 온다.
 */
async function totalForMonth(month: string): Promise<MonthTotals> {
  const { start, end } = monthRange(month);
  const where = { date: { gte: start, lt: end } };

  const [agg, grouped] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const categoryTotals = new Map(
    grouped.map((g) => [
      g.categoryId,
      { amount: g._sum.amount ?? 0, count: g._count },
    ]),
  );

  return { total: agg._sum.amount ?? 0, categoryTotals };
}

export async function buildMonthlySummary(
  month: string,
): Promise<MonthlySummary> {
  const previousMonth = shiftMonth(month, -1);

  const [current, previous, allCategories] = await Promise.all([
    totalForMonth(month),
    totalForMonth(previousMonth),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  const categoryNames = new Map(allCategories.map((c) => [c.id, c.name]));

  const categories: CategoryBreakdown[] = Array.from(
    current.categoryTotals.entries(),
  )
    .map(([categoryId, v]) => ({
      name: categoryNames.get(categoryId) ?? "미분류",
      amount: v.amount,
      count: v.count,
      ratio: current.total > 0 ? Math.round((v.amount / current.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const count = [...current.categoryTotals.values()].reduce(
    (sum, v) => sum + v.count,
    0,
  );

  const diff = current.total - previous.total;
  const diffRatio =
    previous.total > 0 ? Math.round((diff / previous.total) * 1000) / 10 : null;

  return {
    month,
    total: current.total,
    count,
    categories,
    previousMonth,
    previousTotal: previous.total,
    diff,
    diffRatio,
  };
}

const SYSTEM_PROMPT = `당신은 한국어로 개인 가계부의 월간 소비 리포트를 작성하는 재무 어시스턴트입니다.
반드시 다음 규칙을 지키세요:
- 모든 문장을 오직 한국어로만 작성합니다. 영어, 일본어, 중국어 등 다른 언어의 단어나 문자를
  단 하나도 섞지 않습니다 (예: "外食", "大きい" 같은 한자·가나 표기 금지).
- 출력은 마크다운 형식으로 작성합니다 (제목은 "##", 목록은 "-", 강조는 "**텍스트**").
- 톤은 친근하지만 실용적입니다. 과장하거나 훈계하는 말투는 피합니다.
- 사용자가 제공한 숫자 데이터만 근거로 사용하고, 데이터에 없는 사실이나 구체적 항목을 지어내지 않습니다.
- 아래 4개 섹션을 이 순서와 제목 그대로 포함하세요: "## 이번 달 요약", "## 카테고리별 분석", "## 전월 대비", "## 다음 달 제안".
- 지출 데이터가 없거나 거의 없으면 그 사실을 있는 그대로 언급하고 무리하게 분석하지 않습니다.
- 전체 500자 내외로 간결하게 작성합니다.`;

export function buildReportMessages(
  month: string,
  summary: MonthlySummary,
): ChatMessage[] {
  const categoryLines =
    summary.categories.length > 0
      ? summary.categories
          .map(
            (c) =>
              `- ${c.name}: ${formatKRW(c.amount)} (${c.count}건, 전체의 ${c.ratio}%)`,
          )
          .join("\n")
      : "(이번 달 지출 내역 없음)";

  const diffLine =
    summary.previousTotal === 0
      ? `전월(${summary.previousMonth}) 지출 데이터 없음 (비교 불가)`
      : `전월(${summary.previousMonth}) 대비 ${summary.diff >= 0 ? "+" : ""}${formatKRW(summary.diff)} (${summary.diffRatio}%)`;

  const userPrompt = `${month} 지출 데이터:
- 총 지출: ${formatKRW(summary.total)}
- 총 거래 건수: ${summary.count}건
- 카테고리별 내역:
${categoryLines}
- ${diffLine}

위 데이터를 바탕으로 월간 소비 리포트를 작성해주세요.`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}
