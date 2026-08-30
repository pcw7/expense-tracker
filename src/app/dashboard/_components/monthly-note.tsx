"use client";

// AI 리포트와 별개로 사용자가 직접 쓰는 "이번 달 메모" (목표, 다짐, 체크리스트 등).
// 블록 단위 편집(슬래시 커맨드, 드래그 재배치)을 위해 BlockNote를 사용한다.
// DB에는 BlockNote의 블록 트리를 JSON 문자열로 저장한다. BlockNote 도입 전
// 마크다운 문자열로 저장된 과거 메모는 JSON 파싱이 실패하므로, 그 경우 통째로
// 하나의 일반 텍스트 문단으로 보여준다(1회성 손실 있는 마이그레이션).
import { useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import "@blocknote/mantine/style.css";
import { readErrorMessage } from "@/lib/client-fetch";

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

export function MonthlyNote({
  month,
  initialContent,
}: {
  month: string;
  initialContent: string | null;
}) {
  const [content, setContent] = useState(initialContent);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 대시보드에서 다른 달로 이동하면(month prop이 바뀌면) 그 달의 값으로 리셋한다.
  const [renderedForMonth, setRenderedForMonth] = useState(month);
  if (renderedForMonth !== month) {
    setRenderedForMonth(month);
    setContent(initialContent);
    setEditing(false);
    setError(null);
  }

  // month가 바뀔 때만 새 에디터 인스턴스를 만든다(deps 배열).
  const editor = useCreateBlockNote({ initialContent: toInitialBlocks(content) }, [month]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const markdown = JSON.stringify(editor.document);
      const res = await fetch(`/api/notes/${month}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: markdown }),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, "메모 저장에 실패했습니다."));
        return;
      }
      setContent(markdown);
      setEditing(false);
    } catch {
      setError("네트워크 오류로 메모를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    editor.replaceBlocks(editor.document, toInitialBlocks(content) ?? [{ type: "paragraph" }]);
    setEditing(false);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sky-900/12 bg-[var(--dv-sequential-start)] p-4 dark:border-indigo-200/15">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--dv-text-primary)" }}
        >
          이번 달 메모
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-sky-600 hover:underline dark:text-indigo-200"
          >
            {content ? "수정" : "메모 작성"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm" style={{ color: "var(--dv-delta-bad)" }}>
          {error}
        </p>
      )}

      {editing || content ? (
        <div className="rounded-md border border-sky-900/12 dark:border-indigo-200/15">
          <BlockNoteView editor={editor} editable={editing} />
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--dv-text-muted)" }}>
          이번 달 목표나 다짐을 자유롭게 적어보세요.
        </p>
      )}

      {editing && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {saving ? "저장하는 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="rounded-md border border-sky-900/12 px-3 py-1.5 text-sm hover:bg-sky-500/5 dark:border-indigo-200/15 dark:hover:bg-indigo-300/10"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}
