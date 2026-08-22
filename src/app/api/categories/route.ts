import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// GET /api/categories - 카테고리 목록 조회 (이름순)
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

// POST /api/categories - 새 카테고리 생성
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

  const { name, color, icon } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "카테고리 이름(name)은 필수입니다." },
      { status: 400 },
    );
  }

  if (color !== undefined && color !== null && typeof color !== "string") {
    return NextResponse.json(
      { error: "color는 문자열이어야 합니다." },
      { status: 400 },
    );
  }

  if (icon !== undefined && icon !== null && typeof icon !== "string") {
    return NextResponse.json(
      { error: "icon은 문자열이어야 합니다." },
      { status: 400 },
    );
  }

  try {
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        color: color?.trim() || null,
        icon: icon?.trim() || null,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "이미 존재하는 카테고리 이름입니다." },
        { status: 409 },
      );
    }

    throw error;
  }
}
