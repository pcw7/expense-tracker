import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MONTH_REGEX } from "@/lib/date";
import {
  badRequest,
  conflict,
  parseJsonBody,
  isPrismaUniqueConflict,
} from "@/lib/api-response";

// GET /api/budgets?month=YYYY-MM - 해당 월의 예산 목록 조회 (전체 예산 + 카테고리별 예산)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month || !MONTH_REGEX.test(month)) {
    return badRequest("month 쿼리 파라미터는 YYYY-MM 형식이어야 합니다.");
  }

  const budgets = await prisma.budget.findMany({
    where: { month },
    include: { category: true },
    orderBy: [{ categoryId: { sort: "asc", nulls: "first" } }],
  });

  return NextResponse.json({ budgets });
}

// POST /api/budgets - 예산 설정 (같은 month+categoryId 조합이 이미 있으면 upsert로 갱신)
export async function POST(request: Request) {
  const parsedBody = await parseJsonBody(request);
  if ("error" in parsedBody) return parsedBody.error;

  const { month, amount, categoryId } = parsedBody.data;

  if (typeof month !== "string" || !MONTH_REGEX.test(month)) {
    return badRequest("month는 YYYY-MM 형식의 문자열이어야 합니다.");
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    return badRequest("amount는 0 이상의 숫자여야 합니다.");
  }

  if (
    categoryId !== undefined &&
    categoryId !== null &&
    typeof categoryId !== "string"
  ) {
    return badRequest("categoryId는 문자열이거나 null이어야 합니다.");
  }

  const normalizedCategoryId = (categoryId as string | null | undefined) ?? null;
  const roundedAmount = Math.round(amount);

  if (normalizedCategoryId !== null) {
    const category = await prisma.category.findUnique({
      where: { id: normalizedCategoryId },
    });

    if (!category) {
      return badRequest("존재하지 않는 카테고리입니다.");
    }
  }

  try {
    // SQLite의 UNIQUE 인덱스는 NULL을 서로 다른 값으로 취급하므로,
    // 전체 예산(categoryId가 null)은 compound unique 대신 findFirst + create/update로 처리한다.
    const budget =
      normalizedCategoryId === null
        ? await upsertTotalBudget(month, roundedAmount)
        : await prisma.budget.upsert({
            where: {
              month_categoryId: {
                month,
                categoryId: normalizedCategoryId,
              },
            },
            update: { amount: roundedAmount },
            create: {
              month,
              amount: roundedAmount,
              categoryId: normalizedCategoryId,
            },
            include: { category: true },
          });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    if (isPrismaUniqueConflict(error)) {
      return conflict("이미 같은 조건의 예산이 존재합니다.");
    }

    throw error;
  }
}

/**
 * 전체 예산(categoryId: null)을 원자적으로 upsert한다. findFirst와
 * create/update를 하나의 인터랙티브 트랜잭션으로 묶어, 동시에 두 번 제출돼도
 * 중복 row가 생기지 않도록 한다 (SQLite는 트랜잭션 동안 동시 쓰기를 직렬화한다).
 */
async function upsertTotalBudget(month: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.budget.findFirst({
      where: { month, categoryId: null },
    });

    if (existing) {
      return tx.budget.update({
        where: { id: existing.id },
        data: { amount },
        include: { category: true },
      });
    }

    return tx.budget.create({
      data: { month, amount, categoryId: null },
      include: { category: true },
    });
  });
}
