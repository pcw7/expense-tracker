// Shared helpers for Next.js API routes: parsing the JSON body and mapping
// known Prisma error codes to a consistent HTTP status/response shape, so
// every route (expenses/categories/budgets) fails the same way for the same
// class of client/data error.

import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

/**
 * 요청 본문을 JSON으로 파싱하고 object 형태인지 확인한다.
 * 실패 시 그대로 반환할 수 있는 400 응답을 담아 반환한다.
 */
export async function parseJsonBody(
  request: Request,
): Promise<{ data: Record<string, unknown> } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: badRequest("잘못된 요청 본문입니다.") };
  }

  if (typeof body !== "object" || body === null) {
    return { error: badRequest("잘못된 요청 본문입니다.") };
  }

  return { data: body as Record<string, unknown> };
}

/** Prisma의 "레코드를 찾을 수 없음" 에러(update/delete 대상 없음)인지 확인한다. */
export function isPrismaNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

/** Prisma의 unique 제약 위반 에러인지 확인한다. */
export function isPrismaUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** Prisma의 FK 제약 위반 에러인지 확인한다 (참조하는 대상이 존재하지 않음). */
export function isPrismaForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

/** Prisma의 존재하지 않는 관계(FK) 참조 에러인지 확인한다 (생성 시: P2025 또는 P2003). */
export function isPrismaMissingRelation(error: unknown): boolean {
  return isPrismaNotFound(error) || isPrismaForeignKeyViolation(error);
}
