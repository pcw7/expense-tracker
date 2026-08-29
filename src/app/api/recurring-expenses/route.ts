import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  parseJsonBody,
  isPrismaMissingRelation,
} from "@/lib/api-response";

// GET /api/recurring-expenses - 고정지출 항목 목록 조회
export async function GET() {
  const recurringExpenses = await prisma.recurringExpense.findMany({
    include: { category: true },
    orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }],
  });

  return NextResponse.json({ recurringExpenses });
}

type ParsedRecurringInput = {
  name: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number;
};

function parseRecurringInput(
  body: Record<string, unknown>,
): { data: ParsedRecurringInput } | { error: string } {
  const { name, amount, categoryId, dayOfMonth } = body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: "name은 필수입니다." };
  }

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    return { error: "amount는 양의 정수여야 합니다." };
  }

  if (typeof categoryId !== "string" || categoryId.trim().length === 0) {
    return { error: "categoryId는 필수입니다." };
  }

  if (
    typeof dayOfMonth !== "number" ||
    !Number.isInteger(dayOfMonth) ||
    dayOfMonth < 1 ||
    dayOfMonth > 31
  ) {
    return { error: "dayOfMonth는 1~31 사이의 정수여야 합니다." };
  }

  return {
    data: { name: name.trim(), amount, categoryId, dayOfMonth },
  };
}

// POST /api/recurring-expenses - 고정지출 항목 생성
export async function POST(request: Request) {
  const parsedBody = await parseJsonBody(request);
  if ("error" in parsedBody) return parsedBody.error;

  const parsed = parseRecurringInput(parsedBody.data);
  if ("error" in parsed) {
    return badRequest(parsed.error);
  }

  try {
    const recurringExpense = await prisma.recurringExpense.create({
      data: parsed.data,
      include: { category: true },
    });

    return NextResponse.json({ recurringExpense }, { status: 201 });
  } catch (error) {
    if (isPrismaMissingRelation(error)) {
      return badRequest("존재하지 않는 카테고리입니다.");
    }

    throw error;
  }
}
