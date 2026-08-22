import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  parseJsonBody,
  isPrismaMissingRelation,
} from "@/lib/api-response";

// 한 번에 내려주는 지출 내역 상한. 페이지네이션 UI가 없는 임시 안전장치로,
// 이 이상 쌓이면 실제 페이지네이션/기간 필터가 필요하다.
const MAX_EXPENSES = 500;

// GET /api/expenses - 지출 목록 조회 (최신 날짜순)
export async function GET() {
  const expenses = await prisma.expense.findMany({
    include: { category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: MAX_EXPENSES,
  });

  return NextResponse.json({ expenses });
}

type ParsedExpenseInput = {
  amount: number;
  date: Date;
  memo: string | null;
  categoryId: string;
};

/**
 * 요청 본문에서 지출 입력값을 검증한다.
 * 실패 시 에러 메시지를 반환하고, 성공 시 파싱된 값을 반환한다.
 */
function parseExpenseInput(
  body: Record<string, unknown>,
): { data: ParsedExpenseInput } | { error: string } {
  const { amount, date, memo, categoryId } = body;

  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return { error: "amount는 양의 정수여야 합니다." };
  }

  if (typeof date !== "string" || date.trim().length === 0) {
    return { error: "date는 필수입니다." };
  }
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: "date가 올바른 날짜 형식이 아닙니다." };
  }

  if (typeof categoryId !== "string" || categoryId.trim().length === 0) {
    return { error: "categoryId는 필수입니다." };
  }

  if (memo !== undefined && memo !== null && typeof memo !== "string") {
    return { error: "memo는 문자열이어야 합니다." };
  }

  return {
    data: {
      amount,
      date: parsedDate,
      memo: memo ? memo.trim() || null : null,
      categoryId,
    },
  };
}

// POST /api/expenses - 새 지출 생성
export async function POST(request: Request) {
  const parsedBody = await parseJsonBody(request);
  if ("error" in parsedBody) return parsedBody.error;

  const parsed = parseExpenseInput(parsedBody.data);
  if ("error" in parsed) {
    return badRequest(parsed.error);
  }

  try {
    const expense = await prisma.expense.create({
      data: parsed.data,
      include: { category: true },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    // categoryId가 존재하지 않는 카테고리를 가리키면 Prisma가 FK 위반(P2003)으로
    // 실패한다 - 별도의 사전 존재 확인 쿼리 없이 이 케이스를 그대로 처리한다.
    if (isPrismaMissingRelation(error)) {
      return badRequest("존재하지 않는 카테고리입니다.");
    }

    throw error;
  }
}
