// Aggregates Expense data for a given "YYYY-MM" month and turns it into the
// prompt messages sent to OpenRouter for the monthly AI report.

import { prisma } from "@/lib/prisma";
import type { ChatMessage } from "@/lib/openrouter";

export const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

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

function monthRange(month: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const mon = Number(monthStr); // 1-12
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  return { start, end };
}

export function shiftMonth(month: string, delta: number): string {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const mon = Number(monthStr);
  const d = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function totalForMonth(month: string) {
  const { start, end } = monthRange(month);
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lt: end } },
    include: { category: true },
  });
  const total = expenses.reduce((acc, e) => acc + e.amount, 0);
  return { expenses, total };
}

export async function buildMonthlySummary(
  month: string,
): Promise<MonthlySummary> {
  const { expenses, total } = await totalForMonth(month);

  const byCategory = new Map<string, { amount: number; count: number }>();
  for (const e of expenses) {
    const key = e.category?.name ?? "미분류";
    const cur = byCategory.get(key) ?? { amount: 0, count: 0 };
    cur.amount += e.amount;
    cur.count += 1;
    byCategory.set(key, cur);
  }

  const categories: CategoryBreakdown[] = Array.from(byCategory.entries())
    .map(([name, v]) => ({
      name,
      amount: v.amount,
      count: v.count,
      ratio: total > 0 ? Math.round((v.amount / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const previousMonth = shiftMonth(month, -1);
  const { total: previousTotal } = await totalForMonth(previousMonth);

  const diff = total - previousTotal;
  const diffRatio =
    previousTotal > 0 ? Math.round((diff / previousTotal) * 1000) / 10 : null;

  return {
    month,
    total,
    count: expenses.length,
    categories,
    previousMonth,
    previousTotal,
    diff,
    diffRatio,
  };
}

function krw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

const SYSTEM_PROMPT = `당신은 한국어로 개인 가계부의 월간 소비 리포트를 작성하는 재무 어시스턴트입니다.
반드시 다음 규칙을 지키세요:
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
              `- ${c.name}: ${krw(c.amount)} (${c.count}건, 전체의 ${c.ratio}%)`,
          )
          .join("\n")
      : "(이번 달 지출 내역 없음)";

  const diffLine =
    summary.previousTotal === 0
      ? `전월(${summary.previousMonth}) 지출 데이터 없음 (비교 불가)`
      : `전월(${summary.previousMonth}) 대비 ${summary.diff >= 0 ? "+" : ""}${krw(summary.diff)} (${summary.diffRatio}%)`;

  const userPrompt = `${month} 지출 데이터:
- 총 지출: ${krw(summary.total)}
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
