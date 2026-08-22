import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/expenses/[id] - 단건 조회
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!expense) {
    return NextResponse.json(
      { error: "지출 내역을 찾을 수 없습니다." },
      { status: 404 },
    );
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
  body: unknown,
): { data: ParsedExpenseUpdate } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "잘못된 요청 본문입니다." };
  }

  const { amount, date, memo, categoryId } = body as Record<string, unknown>;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 본문입니다." },
      { status: 400 },
    );
  }

  const parsed = parseExpenseUpdate(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { error: "존재하지 않는 카테고리입니다." },
        { status: 400 },
      );
    }
  }

  try {
    const expense = await prisma.expense.update({
      where: { id },
      data: parsed.data,
      include: { category: true },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "지출 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "지출 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    throw error;
  }
}
