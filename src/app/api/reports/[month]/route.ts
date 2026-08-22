import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateChatCompletion,
  OpenRouterConfigError,
  OpenRouterEmptyResponseError,
  OpenRouterRateLimitError,
  OpenRouterTimeoutError,
  OpenRouterUpstreamError,
} from "@/lib/openrouter";
import {
  MONTH_REGEX,
  buildMonthlySummary,
  buildReportMessages,
} from "@/lib/monthlyReportData";

type RouteParams = { params: Promise<{ month: string }> };

function invalidMonthResponse() {
  return NextResponse.json(
    { error: "month는 YYYY-MM 형식이어야 합니다. (예: 2026-08)" },
    { status: 400 },
  );
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { month } = await params;

  if (!MONTH_REGEX.test(month)) {
    return invalidMonthResponse();
  }

  const report = await prisma.monthlyReport.findUnique({ where: { month } });

  if (!report) {
    return NextResponse.json(
      { error: "아직 생성된 리포트가 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    month: report.month,
    content: report.content,
    updatedAt: report.updatedAt,
  });
}

export async function POST(_req: Request, { params }: RouteParams) {
  const { month } = await params;

  if (!MONTH_REGEX.test(month)) {
    return invalidMonthResponse();
  }

  let summary;
  try {
    summary = await buildMonthlySummary(month);
  } catch (err) {
    console.error("[api/reports] failed to aggregate expenses:", err);
    return NextResponse.json(
      { error: "지출 데이터를 집계하는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  const messages = buildReportMessages(month, summary);

  let content: string;
  try {
    content = await generateChatCompletion(messages);
  } catch (err) {
    if (err instanceof OpenRouterConfigError) {
      // Never log err.message here if it could echo the key; it doesn't in
      // our wrapper (only status/text), but stay conservative regardless.
      console.error("[api/reports] OpenRouter config error");
      return NextResponse.json(
        { error: "AI 서비스 설정에 문제가 있습니다. 관리자에게 문의하세요. (API 키 확인 필요)" },
        { status: 500 },
      );
    }
    if (err instanceof OpenRouterRateLimitError) {
      return NextResponse.json(
        { error: "AI 요청이 많아 잠시 후 다시 시도해주세요. (요청 한도 초과)" },
        { status: 429 },
      );
    }
    if (err instanceof OpenRouterTimeoutError) {
      return NextResponse.json(
        { error: "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요." },
        { status: 504 },
      );
    }
    if (err instanceof OpenRouterEmptyResponseError) {
      return NextResponse.json(
        { error: "AI가 빈 응답을 반환했습니다. 잠시 후 다시 시도해주세요." },
        { status: 502 },
      );
    }
    if (err instanceof OpenRouterUpstreamError) {
      console.error("[api/reports] OpenRouter upstream error:", err.message);
      return NextResponse.json(
        { error: `AI 서비스에 일시적인 오류가 발생했습니다 (HTTP ${err.status}). 잠시 후 다시 시도해주세요.` },
        { status: 502 },
      );
    }
    console.error("[api/reports] unexpected error calling OpenRouter:", err);
    return NextResponse.json(
      { error: "리포트를 생성하는 중 알 수 없는 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  const report = await prisma.monthlyReport.upsert({
    where: { month },
    update: { content },
    create: { month, content },
  });

  return NextResponse.json({
    month: report.month,
    content: report.content,
    updatedAt: report.updatedAt,
  });
}
