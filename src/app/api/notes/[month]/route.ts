import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MONTH_REGEX } from "@/lib/date";
import { badRequest, parseJsonBody } from "@/lib/api-response";

type RouteParams = { params: Promise<{ month: string }> };

function invalidMonthResponse() {
  return NextResponse.json(
    { error: "month는 YYYY-MM 형식이어야 합니다. (예: 2026-08)" },
    { status: 400 },
  );
}

// GET /api/notes/[month] - 해당 월의 사용자 메모 조회
export async function GET(_req: Request, { params }: RouteParams) {
  const { month } = await params;
  if (!MONTH_REGEX.test(month)) return invalidMonthResponse();

  const note = await prisma.monthlyNote.findUnique({ where: { month } });
  if (!note) {
    return NextResponse.json({ error: "아직 작성된 메모가 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    month: note.month,
    content: note.content,
    updatedAt: note.updatedAt,
  });
}

// PUT /api/notes/[month] - 메모 저장 (없으면 생성, 있으면 덮어쓰기)
export async function PUT(request: Request, { params }: RouteParams) {
  const { month } = await params;
  if (!MONTH_REGEX.test(month)) return invalidMonthResponse();

  const parsedBody = await parseJsonBody(request);
  if ("error" in parsedBody) return parsedBody.error;

  const { content } = parsedBody.data;
  if (typeof content !== "string") {
    return badRequest("content는 문자열이어야 합니다.");
  }

  const note = await prisma.monthlyNote.upsert({
    where: { month },
    update: { content },
    create: { month, content },
  });

  return NextResponse.json({
    month: note.month,
    content: note.content,
    updatedAt: note.updatedAt,
  });
}

// DELETE /api/notes/[month] - 메모 삭제
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { month } = await params;
  if (!MONTH_REGEX.test(month)) return invalidMonthResponse();

  await prisma.monthlyNote.deleteMany({ where: { month } });
  return new NextResponse(null, { status: 204 });
}
