import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  notFound,
  parseJsonBody,
  isPrismaNotFound,
  isPrismaForeignKeyViolation,
} from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/expenses/[id] - 단건 조회
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!expense) {
    return notFound("지출 내역을 찾을 수 없습니다.");
  }

  return NextResponse.json({ expense });
}

type ParsedExpenseUpdate = {
  amount?: number;
  date?: Date;
  memo?: string | null;
  categoryId?: string;
};

/**
 * PATCH 요청 본문에서 제공된 필드만 검증한다.
 * 각 필드는 선택적이지만, 제공된 경우 유효해야 한다.
 */
function parseExpenseUpdate(
  body: Record<string, unknown>,
): { data: ParsedExpenseUpdate } | { error: string } {
  const { amount, date, memo, categoryId } = body;
  const data: ParsedExpenseUpdate = {};

  if (amount !== undefined) {
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
      return { error: "amount는 양의 정수여야 합니다." };
    }
    data.amount = amount;
  }

  if (date !== undefined) {
    if (typeof date !== "string" || date.trim().length === 0) {
      return { error: "date는 올바른 날짜 형식이어야 합니다." };
    }
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return { error: "date가 올바른 날짜 형식이 아닙니다." };
    }
    data.date = parsedDate;
  }

  if (categoryId !== undefined) {
    if (typeof categoryId !== "string" || categoryId.trim().length === 0) {
      return { error: "categoryId는 비어 있을 수 없습니다." };
    }
    data.categoryId = categoryId;
  }

  if (memo !== undefined) {
    if (memo !== null && typeof memo !== "string") {
      return { error: "memo는 문자열이어야 합니다." };
    }
    data.memo = memo ? memo.trim() || null : null;
  }

  if (Object.keys(data).length === 0) {
    return { error: "수정할 필드가 없습니다." };
  }

  return { data };
}

// PATCH /api/expenses/[id] - 지출 수정
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const parsedBody = await parseJsonBody(request);
  if ("error" in parsedBody) return parsedBody.error;

  const parsed = parseExpenseUpdate(parsedBody.data);
  if ("error" in parsed) {
    return badRequest(parsed.error);
  }

  try {
    const expense = await prisma.expense.update({
      where: { id },
      data: parsed.data,
      include: { category: true },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return notFound("지출 내역을 찾을 수 없습니다.");
    }
    // categoryId가 존재하지 않는 카테고리를 가리키면 FK 위반(P2003)으로 실패한다.
    if (isPrismaForeignKeyViolation(error)) {
      return badRequest("존재하지 않는 카테고리입니다.");
    }

    throw error;
  }
}

// DELETE /api/expenses/[id] - 지출 삭제
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    await prisma.expense.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return notFound("지출 내역을 찾을 수 없습니다.");
    }

    throw error;
  }
}
