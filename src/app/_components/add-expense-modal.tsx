"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { shiftMonth, buildMonthWeeks } from "@/lib/date";
import { readErrorMessage } from "@/lib/client-fetch";

type Category = { id: string; name: string; icon: string | null };

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * 달력 카드 오른쪽 아래의 "+ 지출 추가" 버튼과, 눌렀을 때 뜨는 모달.
 * 모달은 defaultDate(달력에서 선택 중인 날짜)를 기본값으로 열리고, 모달
 * 안에도 미니 달력이 있어 날짜를 다시 고를 수 있다.
 */
export function AddExpenseButton({
  categories,
  defaultDate,
}: {
  categories: Category[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [calMonth, setCalMonth] = useState(defaultDate.slice(0, 7));
  const [amount, setAmount] = useState("");
  const [categoryList, setCategoryList] = useState(categories);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  function openModal() {
    setDate(defaultDate);
    setCalMonth(defaultDate.slice(0, 7));
    setAmount("");
    setCategoryList(categories);
    setCategoryId(categories[0]?.id ?? "");
    setMemo("");
    setError(null);
    setOpen(true);
  }

  function openCategoryModal() {
    setNewCategoryName("");
    setNewCategoryColor("");
    setCategoryError(null);
    setCategoryModalOpen(true);
  }

  async function handleCreateCategory(event: React.FormEvent) {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("카테고리 이름을 입력하세요.");
      return;
    }

    setCategorySubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          color: newCategoryColor.trim() || undefined,
        }),
      });

      if (!res.ok) {
        setCategoryError(
          await readErrorMessage(res, "카테고리 추가에 실패했습니다."),
        );
        return;
      }

      const { category } = (await res.json()) as { category: Category };
      setCategoryList((prev) =>
        [...prev, category].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setCategoryId(category.id);
      setCategoryModalOpen(false);
    } catch {
      setCategoryError("카테고리 추가 중 오류가 발생했습니다.");
    } finally {
      setCategorySubmitting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (categoryModalOpen) setCategoryModalOpen(false);
      else setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, categoryModalOpen]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!amount || !Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError("금액은 1원 이상의 정수로 입력하세요.");
      return;
    }
    if (!categoryId) {
      setError("카테고리를 선택하세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          date,
          categoryId,
          memo: memo.trim() || undefined,
        }),
      });

      if (!res.ok) {
        setError(await readErrorMessage(res, "지출 추가에 실패했습니다."));
        return;
      }

      setOpen(false);
      router.push(`/?calMonth=${date.slice(0, 7)}&date=${date}`);
      router.refresh();
    } catch {
      setError("지출 추가 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const [year, monthNum] = calMonth.split("-").map(Number);
  const weeks = buildMonthWeeks(year, monthNum - 1);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        + 지출 추가
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="지출 추가"
            onClick={(event) => event.stopPropagation()}
            className="dv-root flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-[#121a3d]"
          >
            <div className="flex items-center justify-between">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--dv-text-primary)" }}
              >
                지출 추가
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="rounded-md px-2 py-1 text-lg leading-none hover:bg-sky-500/10 dark:hover:bg-indigo-300/10"
                style={{ color: "var(--dv-text-secondary)" }}
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCalMonth((m) => shiftMonth(m, -1))}
                  aria-label="이전 달"
                  className="rounded-md px-2 py-1 hover:bg-sky-500/10 dark:hover:bg-indigo-300/10"
                >
                  ‹
                </button>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--dv-text-primary)" }}
                >
                  {year}년 {monthNum}월
                </span>
                <button
                  type="button"
                  onClick={() => setCalMonth((m) => shiftMonth(m, 1))}
                  aria-label="다음 달"
                  className="rounded-md px-2 py-1 hover:bg-sky-500/10 dark:hover:bg-indigo-300/10"
                >
                  ›
                </button>
              </div>

              <table className="w-full table-fixed border-collapse text-center text-xs">
                <thead>
                  <tr>
                    {WEEKDAY_LABELS.map((label, i) => (
                      <th
                        key={label}
                        className="pb-1 font-normal"
                        style={{
                          color:
                            i === 0
                              ? "var(--dv-delta-bad)"
                              : i === 6
                                ? "var(--dv-series-1)"
                                : "var(--dv-text-muted)",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, wi) => (
                    <tr key={wi}>
                      {week.map((day, di) => {
                        if (day === null) return <td key={di} />;
                        const dateStr = `${calMonth}-${pad2(day)}`;
                        const isSelected = dateStr === date;
                        return (
                          <td key={di} className="py-0.5">
                            <button
                              type="button"
                              onClick={() => setDate(dateStr)}
                              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                                isSelected
                                  ? "bg-teal-500 font-semibold text-white"
                                  : "hover:bg-sky-500/10 dark:hover:bg-indigo-300/10"
                              }`}
                              style={
                                !isSelected
                                  ? { color: "var(--dv-text-primary)" }
                                  : undefined
                              }
                            >
                              {day}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="text-xs" style={{ color: "var(--dv-text-muted)" }}>
                선택한 날짜: {date}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="modal-amount" className="text-sm">
                  금액
                </label>
                <input
                  id="modal-amount"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="modal-category" className="text-sm">
                    카테고리
                  </label>
                  <button
                    type="button"
                    onClick={openCategoryModal}
                    className="text-xs font-medium text-sky-600 hover:underline dark:text-indigo-200"
                  >
                    + 카테고리 추가
                  </button>
                </div>
                {categoryList.length > 0 ? (
                  <select
                    id="modal-category"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
                  >
                    {categoryList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon ? `${c.icon} ` : ""}
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    등록된 카테고리가 없어요. 먼저 카테고리를 추가해주세요.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="modal-memo" className="text-sm">
                  메모 (선택)
                </label>
                <input
                  id="modal-memo"
                  type="text"
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-4 py-2 text-sm"
                  style={{ color: "var(--dv-text-secondary)" }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting || categoryList.length === 0}
                  className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
                >
                  {submitting ? "추가하는 중..." : "추가"}
                </button>
              </div>
            </form>
          </div>

          {categoryModalOpen && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
              onClick={(event) => {
                event.stopPropagation();
                setCategoryModalOpen(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="카테고리 추가"
                onClick={(event) => event.stopPropagation()}
                className="dv-root flex w-full max-w-xs flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-[#121a3d]"
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--dv-text-primary)" }}
                  >
                    카테고리 추가
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(false)}
                    aria-label="닫기"
                    className="rounded-md px-2 py-1 text-lg leading-none hover:bg-sky-500/10 dark:hover:bg-indigo-300/10"
                    style={{ color: "var(--dv-text-secondary)" }}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateCategory} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="modal-new-category-name" className="text-sm">
                      이름
                    </label>
                    <input
                      id="modal-new-category-name"
                      type="text"
                      autoFocus
                      value={newCategoryName}
                      onChange={(event) => setNewCategoryName(event.target.value)}
                      className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="modal-new-category-color" className="text-sm">
                      색상 (선택, 예: #F97316)
                    </label>
                    <input
                      id="modal-new-category-color"
                      type="text"
                      value={newCategoryColor}
                      onChange={(event) => setNewCategoryColor(event.target.value)}
                      className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
                    />
                  </div>

                  {categoryError && (
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                      {categoryError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCategoryModalOpen(false)}
                      className="rounded-md px-4 py-2 text-sm"
                      style={{ color: "var(--dv-text-secondary)" }}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={categorySubmitting}
                      className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
                    >
                      {categorySubmitting ? "추가하는 중..." : "추가"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
