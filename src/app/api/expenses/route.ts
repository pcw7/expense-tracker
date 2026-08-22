import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// GET /api/expenses - 지출 목록 조회 (최신 날짜순)
export async function GET() {
  const expenses = await prisma.expense.findMany({
    include: { category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
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
  body: unknown,
): { data: ParsedExpenseInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "잘못된 요청 본문입니다." };
  }

  const { amount, date, memo, categoryId } = body as Record<string, unknown>;

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 본문입니다." },
      { status: 400 },
    );
  }

  const parsed = parseExpenseInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) {
    return NextResponse.json(
      { error: "존재하지 않는 카테고리입니다." },
      { status: 400 },
    );
  }

  try {
    const expense = await prisma.expense.create({
      data: parsed.data,
      include: { category: true },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2025" || error.code === "P2003")
    ) {
      return NextResponse.json(
        { error: "존재하지 않는 카테고리입니다." },
        { status: 400 },
      );
    }

    throw error;
  }
}
