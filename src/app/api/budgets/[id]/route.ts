import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, parseJsonBody, isPrismaNotFound } from "@/lib/api-response";

// PATCH /api/budgets/[id] - 예산 금액 수정
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const parsedBody = await parseJsonBody(request);
  if ("error" in parsedBody) return parsedBody.error;

  const { amount } = parsedBody.data;

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    return badRequest("amount는 0 이상의 숫자여야 합니다.");
  }

  try {
    const budget = await prisma.budget.update({
      where: { id },
      data: { amount: Math.round(amount) },
      include: { category: true },
    });

    return NextResponse.json({ budget });
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return notFound("존재하지 않는 예산입니다.");
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
    if (isPrismaNotFound(error)) {
      return notFound("존재하지 않는 예산입니다.");
    }

    throw error;
  }
}
