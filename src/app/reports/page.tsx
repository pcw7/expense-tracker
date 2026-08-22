"use client";

import { useEffect, useMemo, useState } from "react";
import { currentMonthString, shiftMonth } from "@/lib/date";
import { MarkdownView } from "./markdown-view";

type ReportState =
  | { status: "loading" }
  | { status: "generating" }
  | { status: "empty" }
  | { status: "loaded"; content: string; updatedAt: string }
  | { status: "error"; message: string };

function monthOptions(): string[] {
  const current = currentMonthString();
  return Array.from({ length: 12 }, (_, i) => shiftMonth(current, -i));
}

export default function ReportsPage() {
  const [month, setMonth] = useState<string>(() => currentMonthString());
  const [state, setState] = useState<ReportState>({ status: "loading" });
  const [loadedForMonth, setLoadedForMonth] = useState<string>(month);
  const options = useMemo(() => monthOptions(), []);

  // Reset to a loading state as soon as the selected month changes, before
  // the effect below has a chance to run. This is the "adjusting state when
  // a prop changes" pattern React recommends (setState during render, not
  // inside the effect), so it doesn't trigger an extra effect-driven render.
  if (loadedForMonth !== month) {
    setLoadedForMonth(month);
    setState({ status: "loading" });
  }

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/reports/${month}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setState({ status: "empty" });
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setState({
            status: "error",
            message: data?.error ?? `리포트를 불러오지 못했습니다. (HTTP ${res.status})`,
          });
          return;
        }
        const data = await res.json();
        setState({ status: "loaded", content: data.content, updatedAt: data.updatedAt });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error", message: "네트워크 오류로 리포트를 불러오지 못했습니다." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [month]);

  async function handleGenerate() {
    setState({ status: "generating" });
    try {
      const res = await fetch(`/api/reports/${month}`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setState({
          status: "error",
          message: data?.error ?? `리포트 생성에 실패했습니다. (HTTP ${res.status})`,
        });
        return;
      }
      setState({ status: "loaded", content: data.content, updatedAt: data.updatedAt });
    } catch {
      setState({ status: "error", message: "네트워크 오류로 리포트 생성에 실패했습니다." });
    }
  }

  const isGenerating = state.status === "generating";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI 리포트</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          AI가 선택한 달의 지출 데이터를 분석해 소비 인사이트를 만들어드립니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">월 선택</span>
          <select
            className="rounded-md border border-black/[.1] bg-transparent px-2 py-1 text-sm dark:border-white/[.145]"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={isGenerating}
          >
            {options.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isGenerating ? "생성 중..." : "AI 리포트 생성"}
        </button>
      </div>

      <div className="rounded-lg border border-black/[.08] p-6 dark:border-white/[.145]">
        {state.status === "loading" ? (
          <p className="text-sm text-zinc-500">불러오는 중...</p>
        ) : state.status === "generating" ? (
          <p className="text-sm text-zinc-500">
            AI가 {month} 리포트를 생성하고 있습니다. 최대 30초 정도 걸릴 수 있어요...
          </p>
        ) : state.status === "empty" ? (
          <p className="text-sm text-zinc-500">
            {month}에 대한 리포트가 아직 없습니다. &ldquo;AI 리포트 생성&rdquo; 버튼을 눌러 생성해보세요.
          </p>
        ) : state.status === "error" ? (
          <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
        ) : (
          <div>
            <MarkdownView content={state.content} />
            <p className="mt-4 text-xs text-zinc-400">
              마지막 생성: {new Date(state.updatedAt).toLocaleString("ko-KR")}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
