import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

// GET /api/budgets?month=YYYY-MM - 해당 월의 예산 목록 조회 (전체 예산 + 카테고리별 예산)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month || !MONTH_REGEX.test(month)) {
    return NextResponse.json(
      { error: "month 쿼리 파라미터는 YYYY-MM 형식이어야 합니다." },
      { status: 400 },
    );
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 본문입니다." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "잘못된 요청 본문입니다." },
      { status: 400 },
    );
  }

  const { month, amount, categoryId } = body as Record<string, unknown>;

  if (typeof month !== "string" || !MONTH_REGEX.test(month)) {
    return NextResponse.json(
      { error: "month는 YYYY-MM 형식의 문자열이어야 합니다." },
      { status: 400 },
    );
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json(
      { error: "amount는 0 이상의 숫자여야 합니다." },
      { status: 400 },
    );
  }

  if (
    categoryId !== undefined &&
    categoryId !== null &&
    typeof categoryId !== "string"
  ) {
    return NextResponse.json(
      { error: "categoryId는 문자열이거나 null이어야 합니다." },
      { status: 400 },
    );
  }

  const normalizedCategoryId = (categoryId as string | null | undefined) ?? null;
  const roundedAmount = Math.round(amount);

  if (normalizedCategoryId !== null) {
    const category = await prisma.category.findUnique({
      where: { id: normalizedCategoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "존재하지 않는 카테고리입니다." },
        { status: 400 },
      );
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: "예산을 저장하는 중 오류가 발생했습니다." },
        { status: 409 },
      );
    }

    throw error;
  }
}

async function upsertTotalBudget(month: string, amount: number) {
  const existing = await prisma.budget.findFirst({
    where: { month, categoryId: null },
  });

  if (existing) {
    return prisma.budget.update({
      where: { id: existing.id },
      data: { amount },
      include: { category: true },
    });
  }

  return prisma.budget.create({
    data: { month, amount, categoryId: null },
    include: { category: true },
  });
}
