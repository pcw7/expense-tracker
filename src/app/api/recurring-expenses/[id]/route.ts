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

type ParsedRecurringUpdate = {
  name?: string;
  amount?: number;
  categoryId?: string;
  dayOfMonth?: number;
  active?: boolean;
};

function parseRecurringUpdate(
  body: Record<string, unknown>,
): { data: ParsedRecurringUpdate } | { error: string } {
  const { name, amount, categoryId, dayOfMonth, active } = body;
  const data: ParsedRecurringUpdate = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return { error: "name은 비어 있을 수 없습니다." };
    }
    data.name = name.trim();
  }

  if (amount !== undefined) {
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
      return { error: "amount는 양의 정수여야 합니다." };
    }
    data.amount = amount;
  }

  if (categoryId !== undefined) {
    if (typeof categoryId !== "string" || categoryId.trim().length === 0) {
      return { error: "categoryId는 비어 있을 수 없습니다." };
    }
    data.categoryId = categoryId;
  }

  if (dayOfMonth !== undefined) {
    if (
      typeof dayOfMonth !== "number" ||
      !Number.isInteger(dayOfMonth) ||
      dayOfMonth < 1 ||
      dayOfMonth > 31
    ) {
      return { error: "dayOfMonth는 1~31 사이의 정수여야 합니다." };
    }
    data.dayOfMonth = dayOfMonth;
  }

  if (active !== undefined) {
    if (typeof active !== "boolean") {
      return { error: "active는 boolean이어야 합니다." };
    }
    data.active = active;
  }

  if (Object.keys(data).length === 0) {
    return { error: "수정할 필드가 없습니다." };
  }

  return { data };
}

// PATCH /api/recurring-expenses/[id] - 고정지출 항목 수정 (활성/비활성 토글 포함)
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const parsedBody = await parseJsonBody(request);
  if ("error" in parsedBody) return parsedBody.error;

  const parsed = parseRecurringUpdate(parsedBody.data);
  if ("error" in parsed) {
    return badRequest(parsed.error);
  }

  try {
    const recurringExpense = await prisma.recurringExpense.update({
      where: { id },
      data: parsed.data,
      include: { category: true },
    });

    return NextResponse.json({ recurringExpense });
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return notFound("고정지출 항목을 찾을 수 없습니다.");
    }
    if (isPrismaForeignKeyViolation(error)) {
      return badRequest("존재하지 않는 카테고리입니다.");
    }

    throw error;
  }
}

// DELETE /api/recurring-expenses/[id] - 고정지출 항목 삭제 (이미 생성된 지출 내역은 남는다)
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    await prisma.recurringExpense.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return notFound("고정지출 항목을 찾을 수 없습니다.");
    }

    throw error;
  }
}
