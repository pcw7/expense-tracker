"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CategoryModel, BudgetModel } from "@/generated/prisma/models";

type BudgetWithCategory = BudgetModel & { category: CategoryModel | null };

type BudgetManagerProps = {
  month: string;
  categories: CategoryModel[];
  budgets: BudgetWithCategory[];
};

const currencyFormatter = new Intl.NumberFormat("ko-KR");

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "요청을 처리하지 못했습니다.";
  } catch {
    return "요청을 처리하지 못했습니다.";
  }
}

export function BudgetManager({
  month,
  categories,
  budgets,
}: BudgetManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [totalAmountInput, setTotalAmountInput] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [categoryAmountInput, setCategoryAmountInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmountInput, setEditAmountInput] = useState("");

  const totalBudget = budgets.find((b) => b.categoryId === null) ?? null;
  const categoryBudgets = budgets.filter((b) => b.categoryId !== null);
  const budgetedCategoryIds = new Set(
    categoryBudgets.map((b) => b.categoryId),
  );
  const availableCategories = categories.filter(
    (c) => !budgetedCategoryIds.has(c.id),
  );

  function handleMonthChange(newMonth: string) {
    router.push(`/budgets?month=${newMonth}`);
  }

  function refresh() {
    router.refresh();
  }

  async function submitBudget(
    payload: { month: string; amount: number; categoryId: string | null },
    onSuccess: () => void,
  ) {
    setError(null);
    const response = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError(await parseErrorMessage(response));
      return;
    }

    onSuccess();
    startTransition(refresh);
  }

  function handleTotalSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(totalAmountInput);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("올바른 금액을 입력해주세요.");
      return;
    }
    void submitBudget({ month, amount, categoryId: null }, () =>
      setTotalAmountInput(""),
    );
  }

  function handleCategorySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(categoryAmountInput);
    if (!categoryId) {
      setError("카테고리를 선택해주세요.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setError("올바른 금액을 입력해주세요.");
      return;
    }
    void submitBudget({ month, amount, categoryId }, () =>
      setCategoryAmountInput(""),
    );
  }

  async function handleEditSubmit(
    event: React.FormEvent<HTMLFormElement>,
    id: string,
  ) {
    event.preventDefault();
    const amount = Number(editAmountInput);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("올바른 금액을 입력해주세요.");
      return;
    }

    setError(null);
    const response = await fetch(`/api/budgets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      setError(await parseErrorMessage(response));
      return;
    }

    setEditingId(null);
    startTransition(refresh);
  }

  async function handleDelete(id: string) {
    setError(null);
    const response = await fetch(`/api/budgets/${id}`, { method: "DELETE" });

    if (!response.ok && response.status !== 204) {
      setError(await parseErrorMessage(response));
      return;
    }

    startTransition(refresh);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <label htmlFor="month" className="text-sm text-zinc-600 dark:text-zinc-400">
          월 선택
        </label>
        <input
          id="month"
          type="month"
          value={month}
          onChange={(event) => handleMonthChange(event.target.value)}
          className="rounded-md border border-black/[.08] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.145]"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">전체 예산</h2>
        {totalBudget ? (
          <BudgetRow
            budget={totalBudget}
            label="전체"
            editingId={editingId}
            editAmountInput={editAmountInput}
            setEditingId={setEditingId}
            setEditAmountInput={setEditAmountInput}
            onEditSubmit={handleEditSubmit}
            onDelete={handleDelete}
            isPending={isPending}
          />
        ) : (
          <form onSubmit={handleTotalSubmit} className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder="이번 달 전체 예산 (원)"
              value={totalAmountInput}
              onChange={(event) => setTotalAmountInput(event.target.value)}
              className="w-full rounded-md border border-black/[.08] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.145]"
            />
            <button
              type="submit"
              disabled={isPending}
              className="shrink-0 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
            >
              설정
            </button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">카테고리별 예산</h2>

        {categoryBudgets.length > 0 && (
          <ul className="flex flex-col gap-2">
            {categoryBudgets.map((budget) => (
              <li key={budget.id}>
                <BudgetRow
                  budget={budget}
                  label={
                    (budget.category?.icon
                      ? `${budget.category.icon} `
                      : "") + (budget.category?.name ?? "알 수 없음")
                  }
                  editingId={editingId}
                  editAmountInput={editAmountInput}
                  setEditingId={setEditingId}
                  setEditAmountInput={setEditAmountInput}
                  onEditSubmit={handleEditSubmit}
                  onDelete={handleDelete}
                  isPending={isPending}
                />
              </li>
            ))}
          </ul>
        )}

        {availableCategories.length > 0 ? (
          <form onSubmit={handleCategorySubmit} className="flex items-center gap-2">
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="rounded-md border border-black/[.08] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.145]"
            >
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon ? `${category.icon} ` : ""}
                  {category.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              placeholder="카테고리 예산 (원)"
              value={categoryAmountInput}
              onChange={(event) => setCategoryAmountInput(event.target.value)}
              className="w-full rounded-md border border-black/[.08] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.145]"
            />
            <button
              type="submit"
              disabled={isPending}
              className="shrink-0 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
            >
              추가
            </button>
          </form>
        ) : (
          categories.length === 0 && (
            <p className="text-sm text-zinc-500">
              등록된 카테고리가 없습니다. 먼저 카테고리를 추가해주세요.
            </p>
          )
        )}
      </section>
    </div>
  );
}

type BudgetRowProps = {
  budget: BudgetWithCategory;
  label: string;
  editingId: string | null;
  editAmountInput: string;
  setEditingId: (id: string | null) => void;
  setEditAmountInput: (value: string) => void;
  onEditSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    id: string,
  ) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
};

function BudgetRow({
  budget,
  label,
  editingId,
  editAmountInput,
  setEditingId,
  setEditAmountInput,
  onEditSubmit,
  onDelete,
  isPending,
}: BudgetRowProps) {
  const isEditing = editingId === budget.id;

  if (isEditing) {
    return (
      <form
        onSubmit={(event) => onEditSubmit(event, budget.id)}
        className="flex items-center gap-2 rounded-md border border-black/[.08] px-3 py-2 dark:border-white/[.145]"
      >
        <span className="w-24 shrink-0 text-sm">{label}</span>
        <input
          type="number"
          min={0}
          autoFocus
          value={editAmountInput}
          onChange={(event) => setEditAmountInput(event.target.value)}
          className="w-full rounded-md border border-black/[.08] bg-transparent px-2 py-1 text-sm dark:border-white/[.145]"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background disabled:opacity-50"
        >
          저장
        </button>
        <button
          type="button"
          onClick={() => setEditingId(null)}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400"
        >
          취소
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-black/[.08] px-3 py-2 dark:border-white/[.145]">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {currencyFormatter.format(budget.amount)}원
        </span>
        <button
          type="button"
          onClick={() => {
            setEditingId(budget.id);
            setEditAmountInput(String(budget.amount));
          }}
          className="text-xs text-zinc-600 hover:underline dark:text-zinc-400"
        >
          수정
        </button>
        <button
          type="button"
          onClick={() => onDelete(budget.id)}
          disabled={isPending}
          className="text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
