"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatKRW } from "@/lib/format";
import { readErrorMessage } from "@/lib/client-fetch";

type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

type Expense = {
  id: string;
  amount: number;
  date: string;
  memo: string | null;
  categoryId: string;
  category: Category;
};

type ExpenseFormValues = {
  amount: string;
  date: string;
  categoryId: string;
  memo: string;
};

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function emptyExpenseForm(categoryId = ""): ExpenseFormValues {
  return { amount: "", date: todayInputValue(), categoryId, memo: "" };
}

function formatDate(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  // 지출 날짜는 date-only 값("YYYY-MM-DD")이 UTC 자정으로 저장된 값이다.
  // 브라우저 로컬 타임존으로 변환해 표시하면 UTC보다 시간이 느린 타임존에서
  // 하루 전 날짜로 보일 수 있으므로, 저장된 그대로 UTC 기준으로 표시한다.
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  });
}

/**
 * 지출 입력 폼(신규/수정 공용) 값을 검증한다. 유효하면 null, 아니면 에러
 * 메시지를 반환한다.
 */
function validateExpenseForm(values: ExpenseFormValues): string | null {
  const amount = Number(values.amount);
  if (!values.amount || !Number.isInteger(amount) || amount <= 0) {
    return "금액은 1원 이상의 정수로 입력하세요.";
  }
  if (!values.date) {
    return "날짜를 입력하세요.";
  }
  if (!values.categoryId) {
    return "카테고리를 선택하세요.";
  }
  return null;
}

async function fetchExpensesPageData(): Promise<{
  categories: Category[];
  expenses: Expense[];
}> {
  const [categoriesRes, expensesRes] = await Promise.all([
    fetch("/api/categories"),
    fetch("/api/expenses"),
  ]);

  if (!categoriesRes.ok) {
    throw new Error(
      await readErrorMessage(categoriesRes, "카테고리를 불러오지 못했습니다."),
    );
  }
  if (!expensesRes.ok) {
    throw new Error(
      await readErrorMessage(expensesRes, "지출 내역을 불러오지 못했습니다."),
    );
  }

  const categoriesBody = (await categoriesRes.json()) as {
    categories: Category[];
  };
  const expensesBody = (await expensesRes.json()) as { expenses: Expense[] };

  return {
    categories: categoriesBody.categories,
    expenses: expensesBody.expenses,
  };
}

export default function ExpensesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  const [form, setForm] = useState<ExpenseFormValues>(() => emptyExpenseForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExpenseFormValues>(() =>
    emptyExpenseForm(),
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // 데이터 로딩 자체(fetchExpensesPageData)는 컴포넌트 바깥의 순수 함수이고,
  // 여기서는 그 결과를 각각의 .then/.catch/.finally 콜백 안에서만 state에
  // 반영한다. effect가 마운트 시 한 번 데이터를 불러오는 표준 패턴이다.
  const loadData = useCallback(() => {
    fetchExpensesPageData()
      .then(({ categories: loadedCategories, expenses: loadedExpenses }) => {
        setCategories(loadedCategories);
        setExpenses(loadedExpenses);
        setForm((prev) => ({
          ...prev,
          categoryId: prev.categoryId || loadedCategories[0]?.id || "",
        }));
        setNewCategoryOpen(loadedCategories.length === 0);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof Error
            ? error.message
            : "데이터를 불러오는 중 오류가 발생했습니다.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasCategories = categories.length > 0;

  const sortedExpenses = useMemo(
    () =>
      [...expenses].sort((a, b) => {
        if (a.date === b.date) return 0;
        return a.date > b.date ? -1 : 1;
      }),
    [expenses],
  );

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError(null);

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
      setCategories((prev) =>
        [...prev, category].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setForm((prev) => ({ ...prev, categoryId: category.id }));
      setNewCategoryName("");
      setNewCategoryColor("");
      setNewCategoryOpen(false);
    } catch {
      setCategoryError("카테고리 추가 중 오류가 발생했습니다.");
    } finally {
      setCategorySubmitting(false);
    }
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const validationError = validateExpenseForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const amount = Number(form.amount);

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          date: form.date,
          categoryId: form.categoryId,
          memo: form.memo.trim() || undefined,
        }),
      });

      if (!res.ok) {
        setFormError(await readErrorMessage(res, "지출 추가에 실패했습니다."));
        return;
      }

      const { expense } = (await res.json()) as { expense: Expense };
      setExpenses((prev) => [expense, ...prev]);
      setForm(emptyExpenseForm(form.categoryId));
    } catch {
      setFormError("지출 추가 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id);
    setEditError(null);
    setEditForm({
      amount: String(expense.amount),
      date: expense.date.slice(0, 10),
      categoryId: expense.categoryId,
      memo: expense.memo ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleUpdateExpense(e: React.FormEvent, id: string) {
    e.preventDefault();
    setEditError(null);

    const validationError = validateExpenseForm(editForm);
    if (validationError) {
      setEditError(validationError);
      return;
    }
    const amount = Number(editForm.amount);

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          date: editForm.date,
          categoryId: editForm.categoryId,
          memo: editForm.memo.trim() || null,
        }),
      });

      if (!res.ok) {
        setEditError(await readErrorMessage(res, "지출 수정에 실패했습니다."));
        return;
      }

      const { expense } = (await res.json()) as { expense: Expense };
      setExpenses((prev) => prev.map((exp) => (exp.id === id ? expense : exp)));
      setEditingId(null);
    } catch {
      setEditError("지출 수정 중 오류가 발생했습니다.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!window.confirm("이 지출 내역을 삭제할까요?")) return;

    setListError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        setListError(await readErrorMessage(res, "지출 삭제에 실패했습니다."));
        return;
      }
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      if (editingId === id) setEditingId(null);
    } catch {
      setListError("지출 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">지출 내역</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          지출을 기록하고 목록을 확인·수정합니다.
        </p>
      </div>

      {loading ? (
        <p role="status" className="text-zinc-600 dark:text-zinc-400">
          불러오는 중...
        </p>
      ) : loadError ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              void loadData();
            }}
            className="self-start rounded-md border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <section
            aria-labelledby="new-expense-heading"
            className="flex flex-col gap-4 rounded-lg border border-black/[.08] p-5 dark:border-white/[.145]"
          >
            <h2
              id="new-expense-heading"
              className="text-lg font-medium tracking-tight"
            >
              새 지출 추가
            </h2>

            {!hasCategories && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                등록된 카테고리가 없습니다. 지출을 추가하려면 먼저 카테고리를
                추가하세요.
              </p>
            )}

            <form
              onSubmit={handleCreateExpense}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="expense-amount" className="text-sm font-medium">
                    금액
                  </label>
                  <input
                    id="expense-amount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    required
                    value={form.amount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 dark:border-white/[.145]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="expense-date" className="text-sm font-medium">
                    날짜
                  </label>
                  <input
                    id="expense-date"
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 dark:border-white/[.145]"
                  />
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label
                    htmlFor="expense-category"
                    className="text-sm font-medium"
                  >
                    카테고리
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      id="expense-category"
                      required
                      disabled={!hasCategories}
                      value={form.categoryId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          categoryId: e.target.value,
                        }))
                      }
                      className="min-w-48 rounded-md border border-black/[.08] bg-transparent px-3 py-2 disabled:opacity-50 dark:border-white/[.145]"
                    >
                      {!hasCategories && <option value="">카테고리 없음</option>}
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon ? `${c.icon} ` : ""}
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setNewCategoryOpen((v) => !v)}
                      aria-expanded={newCategoryOpen}
                      aria-controls="new-category-form"
                      className="rounded-md border border-black/[.08] px-3 py-2 text-sm hover:bg-black/[.03] dark:border-white/[.145] dark:hover:bg-white/[.04]"
                    >
                      {newCategoryOpen ? "카테고리 추가 취소" : "+ 새 카테고리"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label htmlFor="expense-memo" className="text-sm font-medium">
                    메모 (선택)
                  </label>
                  <input
                    id="expense-memo"
                    type="text"
                    value={form.memo}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, memo: e.target.value }))
                    }
                    className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 dark:border-white/[.145]"
                  />
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !hasCategories}
                className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {submitting ? "추가하는 중..." : "지출 추가"}
              </button>
            </form>

            {newCategoryOpen && (
              <form
                id="new-category-form"
                onSubmit={handleCreateCategory}
                className="flex flex-col gap-3 rounded-md border border-black/[.08] p-4 dark:border-white/[.145]"
              >
                <h3 className="text-sm font-medium">새 카테고리 추가</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="category-name" className="text-sm">
                      이름
                    </label>
                    <input
                      id="category-name"
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 dark:border-white/[.145]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="category-color" className="text-sm">
                      색상 (선택, 예: #F97316)
                    </label>
                    <input
                      id="category-color"
                      type="text"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 dark:border-white/[.145]"
                    />
                  </div>
                </div>

                {categoryError && (
                  <p
                    role="alert"
                    className="text-sm text-red-600 dark:text-red-400"
                  >
                    {categoryError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={categorySubmitting}
                  className="self-start rounded-md border border-black/[.08] px-4 py-2 text-sm font-medium hover:bg-black/[.03] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-white/[.04]"
                >
                  {categorySubmitting ? "추가하는 중..." : "카테고리 추가"}
                </button>
              </form>
            )}
          </section>

          <section aria-labelledby="expense-list-heading" className="flex flex-col gap-3">
            <h2
              id="expense-list-heading"
              className="text-lg font-medium tracking-tight"
            >
              지출 목록
            </h2>

            {listError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {listError}
              </p>
            )}

            {sortedExpenses.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400">
                등록된 지출 내역이 없습니다.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {sortedExpenses.map((expense) => {
                  const isEditing = editingId === expense.id;

                  return (
                    <li
                      key={expense.id}
                      className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
                    >
                      {isEditing ? (
                        <form
                          onSubmit={(e) => handleUpdateExpense(e, expense.id)}
                          className="flex flex-col gap-3"
                        >
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor={`edit-amount-${expense.id}`}
                                className="text-sm font-medium"
                              >
                                금액
                              </label>
                              <input
                                id={`edit-amount-${expense.id}`}
                                type="number"
                                inputMode="numeric"
                                min={1}
                                step={1}
                                required
                                value={editForm.amount}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    amount: e.target.value,
                                  }))
                                }
                                className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 dark:border-white/[.145]"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor={`edit-date-${expense.id}`}
                                className="text-sm font-medium"
                              >
                                날짜
                              </label>
                              <input
                                id={`edit-date-${expense.id}`}
                                type="date"
                                required
                                value={editForm.date}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    date: e.target.value,
                                  }))
                                }
                                className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 dark:border-white/[.145]"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor={`edit-category-${expense.id}`}
                                className="text-sm font-medium"
                              >
                                카테고리
                              </label>
                              <select
                                id={`edit-category-${expense.id}`}
                                required
                                value={editForm.categoryId}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    categoryId: e.target.value,
                                  }))
                                }
                                className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 dark:border-white/[.145]"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.icon ? `${c.icon} ` : ""}
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor={`edit-memo-${expense.id}`}
                                className="text-sm font-medium"
                              >
                                메모 (선택)
                              </label>
                              <input
                                id={`edit-memo-${expense.id}`}
                                type="text"
                                value={editForm.memo}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    memo: e.target.value,
                                  }))
                                }
                                className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 dark:border-white/[.145]"
                              />
                            </div>
                          </div>

                          {editError && (
                            <p
                              role="alert"
                              className="text-sm text-red-600 dark:text-red-400"
                            >
                              {editError}
                            </p>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={editSubmitting}
                              className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
                            >
                              {editSubmitting ? "저장하는 중..." : "저장"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-md border border-black/[.08] px-3 py-1.5 text-sm hover:bg-black/[.03] dark:border-white/[.145] dark:hover:bg-white/[.04]"
                            >
                              취소
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                              <span>{formatDate(expense.date)}</span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                {expense.category.color && (
                                  <span
                                    aria-hidden="true"
                                    className="inline-block size-2.5 rounded-full"
                                    style={{
                                      backgroundColor: expense.category.color,
                                    }}
                                  />
                                )}
                                {expense.category.icon
                                  ? `${expense.category.icon} `
                                  : ""}
                                {expense.category.name}
                              </span>
                            </div>
                            <span className="text-lg font-semibold">
                              {formatKRW(expense.amount)}
                            </span>
                            {expense.memo && (
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {expense.memo}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(expense)}
                              className="rounded-md border border-black/[.08] px-3 py-1.5 text-sm hover:bg-black/[.03] dark:border-white/[.145] dark:hover:bg-white/[.04]"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteExpense(expense.id)}
                              disabled={deletingId === expense.id}
                              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                            >
                              {deletingId === expense.id ? "삭제하는 중..." : "삭제"}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
