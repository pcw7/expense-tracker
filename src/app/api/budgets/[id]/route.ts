import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// PATCH /api/budgets/[id] - 예산 금액 수정
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "잘못된 요청 본문입니다." },
      { status: 400 },
    );
  }

  const { amount } = body as Record<string, unknown>;

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json(
      { error: "amount는 0 이상의 숫자여야 합니다." },
      { status: 400 },
    );
  }

  try {
    const budget = await prisma.budget.update({
      where: { id },
      data: { amount: Math.round(amount) },
      include: { category: true },
    });

    return NextResponse.json({ budget });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "존재하지 않는 예산입니다." },
        { status: 404 },
      );
    }

    throw error;
  }
}

// DELETE /api/budgets/[id] - 예산 삭제
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await prisma.budget.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "존재하지 않는 예산입니다." },
        { status: 404 },
      );
    }

    throw error;
  }
}
