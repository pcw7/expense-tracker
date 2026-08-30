"use client";

// AI 리포트와 별개로 사용자가 직접 쓰는 "이번 달 메모" (목표, 다짐, 체크리스트 등).
// 노션처럼 항상 편집 가능한 상태로 두고, 입력을 멈추면 잠시 후 자동 저장한다.
// 블록 단위 편집(슬래시 커맨드, 드래그 재배치)을 위해 BlockNote를 사용한다.
// DB에는 BlockNote의 블록 트리를 JSON 문자열로 저장한다. BlockNote 도입 전
// 마크다운 문자열로 저장된 과거 메모는 JSON 파싱이 실패하므로, 그 경우 통째로
// 하나의 일반 텍스트 문단으로 보여준다(1회성 손실 있는 마이그레이션).
import { useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import "@blocknote/mantine/style.css";

function toInitialBlocks(raw: string | null): PartialBlock[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as PartialBlock[];
  } catch {
    // 레거시 마크다운 문자열 — 아래에서 일반 텍스트로 처리
  }
  return [{ type: "paragraph", content: raw }];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1000;

export function MonthlyNote({
  month,
  initialContent,
}: {
  month: string;
  initialContent: string | null;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  // 대시보드에서 다른 달로 이동하면(month prop이 바뀌면) 상태 표시를 리셋한다.
  const [renderedForMonth, setRenderedForMonth] = useState(month);
  if (renderedForMonth !== month) {
    setRenderedForMonth(month);
    setStatus("idle");
  }

  // month가 바뀔 때만 새 에디터 인스턴스를 만든다(deps 배열).
  const editor = useCreateBlockNote({ initialContent: toInitialBlocks(initialContent) }, [month]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function save() {
      setStatus("saving");
      fetch(`/api/notes/${month}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(editor.document) }),
      })
        .then((res) => {
          setStatus(res.ok ? "saved" : "error");
          if (res.ok) {
            savedFlashTimerRef.current = setTimeout(() => setStatus("idle"), 2000);
          }
        })
        .catch(() => setStatus("error"));
    }

    const unsubscribe = editor.onChange(() => {
      setStatus("idle");
      if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(save, AUTOSAVE_DELAY_MS);
    });

    return () => {
      unsubscribe();
      if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
      // 저장 대기 중이던 변경사항은 달을 옮기기 전에 바로 반영한다.
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        save();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sky-900/12 bg-[var(--dv-sequential-start)] p-4 dark:border-indigo-200/15">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--dv-text-primary)" }}
        >
          이번 달 메모
        </h2>
        <span
          className="text-xs"
          style={{
            color: status === "error" ? "var(--dv-delta-bad)" : "var(--dv-text-muted)",
          }}
        >
          {status === "saving" && "저장 중..."}
          {status === "saved" && "저장됨"}
          {status === "error" && "저장 실패"}
        </span>
      </div>

      <div className="rounded-md border border-sky-900/12 dark:border-indigo-200/15">
        <BlockNoteView editor={editor} editable />
      </div>
    </div>
  );
}
