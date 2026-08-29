"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CategoryModel, RecurringExpenseModel } from "@/generated/prisma/models";
import { formatKRW } from "@/lib/format";
import { readErrorMessage } from "@/lib/client-fetch";

type RecurringWithCategory = RecurringExpenseModel & { category: CategoryModel };

type RecurringManagerProps = {
  categories: CategoryModel[];
  recurringExpenses: RecurringWithCategory[];
};

type FormValues = {
  name: string;
  amount: string;
  categoryId: string;
  dayOfMonth: string;
};

function emptyForm(categoryId = ""): FormValues {
  return { name: "", amount: "", categoryId, dayOfMonth: "1" };
}

function validate(values: FormValues): string | null {
  if (!values.name.trim()) return "이름을 입력하세요.";
  const amount = Number(values.amount);
  if (!values.amount || !Number.isInteger(amount) || amount <= 0) {
    return "금액은 1원 이상의 정수로 입력하세요.";
  }
  if (!values.categoryId) return "카테고리를 선택하세요.";
  const day = Number(values.dayOfMonth);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return "매월 며칠은 1~31 사이여야 합니다.";
  }
  return null;
}

export function RecurringManager({
  categories,
  recurringExpenses,
}: RecurringManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [form, setForm] = useState<FormValues>(() =>
    emptyForm(categories[0]?.id ?? ""),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormValues>(() => emptyForm());
  const [editError, setEditError] = useState<string | null>(null);

  const hasCategories = categories.length > 0;
  const busy = isPending || submitting;

  function refresh() {
    router.refresh();
  }

  function startEdit(item: RecurringWithCategory) {
    setEditingId(item.id);
    setEditError(null);
    setEditForm({
      name: item.name,
      amount: String(item.amount),
      categoryId: item.categoryId,
      dayOfMonth: String(item.dayOfMonth),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const validationError = validate(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/recurring-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          amount: Number(form.amount),
          categoryId: form.categoryId,
          dayOfMonth: Number(form.dayOfMonth),
        }),
      });

      if (!response.ok) {
        setFormError(await readErrorMessage(response, "고정지출 추가에 실패했습니다."));
        return;
      }

      setForm(emptyForm(form.categoryId));
      startTransition(refresh);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(event: React.FormEvent, id: string) {
    event.preventDefault();
    setEditError(null);

    const validationError = validate(editForm);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setBusyId(id);
    try {
      const response = await fetch(`/api/recurring-expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          amount: Number(editForm.amount),
          categoryId: editForm.categoryId,
          dayOfMonth: Number(editForm.dayOfMonth),
        }),
      });

      if (!response.ok) {
        setEditError(await readErrorMessage(response, "고정지출 수정에 실패했습니다."));
        return;
      }

      setEditingId(null);
      startTransition(refresh);
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(item: RecurringWithCategory) {
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/recurring-expenses/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });

      if (!response.ok) return;
      startTransition(refresh);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 고정지출 항목을 삭제할까요? 이미 생성된 지출 내역은 남습니다.")) {
      return;
    }

    setBusyId(id);
    try {
      const response = await fetch(`/api/recurring-expenses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) return;
      if (editingId === id) setEditingId(null);
      startTransition(refresh);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section
        aria-labelledby="new-recurring-heading"
        className="flex flex-col gap-4 rounded-lg border border-sky-900/12 p-5 dark:border-indigo-200/15"
      >
        <h2 id="new-recurring-heading" className="text-lg font-medium tracking-tight">
          고정지출 추가
        </h2>

        {!hasCategories && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            등록된 카테고리가 없습니다.
          </p>
        )}

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="recurring-name" className="text-sm font-medium">
                이름
              </label>
              <input
                id="recurring-name"
                type="text"
                required
                placeholder="예: 월세"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="recurring-amount" className="text-sm font-medium">
                금액
              </label>
              <input
                id="recurring-amount"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="recurring-category" className="text-sm font-medium">
                카테고리
              </label>
              <select
                id="recurring-category"
                required
                disabled={!hasCategories}
                value={form.categoryId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, categoryId: e.target.value }))
                }
                className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 disabled:opacity-50 dark:border-indigo-200/15"
              >
                {!hasCategories && <option value="">카테고리 없음</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="recurring-day" className="text-sm font-medium">
                매월 며칠
              </label>
              <input
                id="recurring-day"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                step={1}
                required
                value={form.dayOfMonth}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dayOfMonth: e.target.value }))
                }
                className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
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
            disabled={busy || !hasCategories}
            className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {submitting ? "추가하는 중..." : "고정지출 추가"}
          </button>
        </form>
      </section>

      <section aria-labelledby="recurring-list-heading" className="flex flex-col gap-3">
        <h2 id="recurring-list-heading" className="text-lg font-medium tracking-tight">
          등록된 고정지출
        </h2>

        {recurringExpenses.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            등록된 고정지출이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recurringExpenses.map((item) => {
              const isEditing = editingId === item.id;
              const itemBusy = busyId === item.id;

              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-sky-900/12 p-4 dark:border-indigo-200/15"
                >
                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleUpdate(e, item.id)}
                      className="flex flex-col gap-3"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          required
                          aria-label="이름"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
                        />
                        <input
                          type="number"
                          min={1}
                          step={1}
                          required
                          aria-label="금액"
                          value={editForm.amount}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, amount: e.target.value }))
                          }
                          className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
                        />
                        <select
                          required
                          aria-label="카테고리"
                          value={editForm.categoryId}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))
                          }
                          className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon ? `${c.icon} ` : ""}
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          step={1}
                          required
                          aria-label="매월 며칠"
                          value={editForm.dayOfMonth}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, dayOfMonth: e.target.value }))
                          }
                          className="rounded-md border border-sky-900/12 bg-transparent px-3 py-2 dark:border-indigo-200/15"
                        />
                      </div>

                      {editError && (
                        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                          {editError}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={itemBusy}
                          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-md border border-sky-900/12 px-3 py-1.5 text-sm hover:bg-sky-500/5 dark:border-indigo-200/15 dark:hover:bg-indigo-300/10"
                        >
                          취소
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <span>
                            {item.category.icon ? `${item.category.icon} ` : ""}
                            {item.category.name}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>매월 {item.dayOfMonth}일</span>
                          {!item.active && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-zinc-400">일시중지</span>
                            </>
                          )}
                        </div>
                        <span className="text-lg font-semibold">{item.name}</span>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {formatKRW(item.amount)}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(item)}
                          disabled={itemBusy}
                          className="rounded-md border border-sky-900/12 px-3 py-1.5 text-sm hover:bg-sky-500/5 disabled:opacity-50 dark:border-indigo-200/15 dark:hover:bg-indigo-300/10"
                        >
                          {item.active ? "일시중지" : "재개"}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-md border border-sky-900/12 px-3 py-1.5 text-sm hover:bg-sky-500/5 dark:border-indigo-200/15 dark:hover:bg-indigo-300/10"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          disabled={itemBusy}
                          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                        >
                          삭제
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
    </div>
  );
}
