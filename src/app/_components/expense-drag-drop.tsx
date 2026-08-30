"use client";

// 지출 카드를 달력의 다른 날짜로 드래그해서 옮기는 기능. HTML5 드래그&드롭
// 이벤트는 서버 컴포넌트에서 쓸 수 없어서(이벤트 핸들러는 클라이언트 전용),
// 달력 날짜 칸과 지출 카드만 이 파일에서 클라이언트 컴포넌트로 분리했다.
// 무거운 캘린더 라이브러리 없이, 필요한 최소 동작만 직접 구현한다.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatKRW } from "@/lib/format";
import { readErrorMessage } from "@/lib/client-fetch";

const DRAG_MIME = "application/x-expense-id";

type ExpenseForCard = {
  id: string;
  amount: number;
  memo: string | null;
  recurringExpenseId: string | null;
  category: {
    icon: string | null;
    name: string;
    color: string | null;
  };
};

export function DraggableExpenseRow({ expense }: { expense: ExpenseForCard }) {
  const [dragging, setDragging] = useState(false);
  const categoryColor = expense.category.color ?? "var(--dv-text-muted)";

  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_MIME, expense.id);
        event.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className="flex cursor-grab items-center gap-4 rounded-xl border px-3 py-1.5 active:cursor-grabbing"
      style={{
        backgroundColor: `color-mix(in srgb, ${categoryColor} 16%, var(--dv-surface))`,
        borderColor: `color-mix(in srgb, ${categoryColor} 35%, transparent)`,
        opacity: dragging ? 0.4 : 1,
      }}
    >
      <div className="flex w-14 shrink-0 flex-col items-center gap-0.5">
        <span className="text-lg leading-none">{expense.category.icon ?? "🏷️"}</span>
        <span
          className="text-center text-[10px] leading-tight"
          style={{ color: "var(--dv-text-muted)" }}
        >
          {expense.category.name}
        </span>
      </div>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        {expense.memo && (
          <span
            className="min-w-0 truncate text-sm"
            style={{ color: "var(--dv-text-primary)" }}
          >
            {expense.memo}
          </span>
        )}
        {expense.recurringExpenseId && (
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: "var(--dv-track)", color: "var(--dv-text-muted)" }}
          >
            고정
          </span>
        )}
      </span>
      <span
        className="shrink-0 text-sm font-medium tabular-nums"
        style={{ color: "var(--dv-text-secondary)" }}
      >
        {formatKRW(expense.amount)}
      </span>
    </li>
  );
}

export function CalendarDayCell({
  calMonth,
  dateStr,
  day,
  isSelected,
  isToday,
  hasExpense,
}: {
  calMonth: string;
  dateStr: string;
  day: number;
  isSelected: boolean;
  isToday: boolean;
  hasExpense: boolean;
}) {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [moving, setMoving] = useState(false);

  async function handleDrop(event: React.DragEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setDragOver(false);

    const expenseId = event.dataTransfer.getData(DRAG_MIME);
    if (!expenseId) return;

    setMoving(true);
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });

      if (!response.ok) {
        window.alert(await readErrorMessage(response, "지출 날짜를 옮기지 못했습니다."));
        return;
      }

      router.refresh();
    } catch {
      window.alert("지출 날짜를 옮기는 중 오류가 발생했습니다.");
    } finally {
      setMoving(false);
    }
  }

  return (
    <Link
      href={`/?calMonth=${calMonth}&date=${dateStr}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => void handleDrop(event)}
      className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
        isSelected
          ? "bg-teal-500 font-semibold text-white"
          : isToday
            ? "border border-teal-500 font-semibold"
            : "hover:bg-sky-500/10 dark:hover:bg-indigo-300/10"
      } ${dragOver ? "ring-2 ring-teal-500 ring-offset-1" : ""} ${moving ? "opacity-50" : ""}`}
      style={!isSelected ? { color: "var(--dv-text-primary)" } : undefined}
    >
      {day}
      {hasExpense && !isSelected && (
        <span
          aria-hidden="true"
          className="absolute bottom-0.5 h-1 w-1 rounded-full"
          style={{ backgroundColor: "var(--dv-series-1)" }}
        />
      )}
    </Link>
  );
}
