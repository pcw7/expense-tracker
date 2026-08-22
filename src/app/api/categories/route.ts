import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  conflict,
  parseJsonBody,
  isPrismaUniqueConflict,
} from "@/lib/api-response";

// GET /api/categories - 카테고리 목록 조회 (이름순)
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

// POST /api/categories - 새 카테고리 생성
export async function POST(request: Request) {
  const parsedBody = await parseJsonBody(request);
  if ("error" in parsedBody) return parsedBody.error;

  const { name, color, icon } = parsedBody.data;

  if (typeof name !== "string" || name.trim().length === 0) {
    return badRequest("카테고리 이름(name)은 필수입니다.");
  }

  if (color !== undefined && color !== null && typeof color !== "string") {
    return badRequest("color는 문자열이어야 합니다.");
  }

  if (icon !== undefined && icon !== null && typeof icon !== "string") {
    return badRequest("icon은 문자열이어야 합니다.");
  }

  try {
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        color: (color as string | undefined)?.trim() || null,
        icon: (icon as string | undefined)?.trim() || null,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (isPrismaUniqueConflict(error)) {
      return conflict("이미 존재하는 카테고리 이름입니다.");
    }

    throw error;
  }
}
