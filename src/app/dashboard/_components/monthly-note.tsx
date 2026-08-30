"use client";

// AI 리포트와 별개로 사용자가 직접 쓰는 "이번 달 메모" (목표, 다짐, 체크리스트 등).
// TOAST UI Editor는 브라우저 DOM(ProseMirror)에 의존해서, Chart 때와 같은 이유로
// useEffect 안에서만 동적 import한다. usageStatistics도 명시적으로 끈다.
import { useEffect, useRef, useState } from "react";
import type EditorType from "@toast-ui/editor";
import { MarkdownView } from "../../_components/markdown-view";
import { readErrorMessage } from "@/lib/client-fetch";
import "@toast-ui/editor/toastui-editor.css";

export function MonthlyNote({
  month,
  initialContent,
}: {
  month: string;
  initialContent: string | null;
}) {
  const [content, setContent] = useState(initialContent ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorType | null>(null);

  // 대시보드에서 다른 달로 이동하면(month prop이 바뀌면) 그 달의 값으로 리셋한다.
  // effect가 아니라 렌더 중 조건부 setState로 처리해, 리셋 프레임 하나 없이
  // 바로 새 달의 값으로 렌더된다(React의 "props 변경에 맞춰 state 조정" 패턴).
  const [renderedForMonth, setRenderedForMonth] = useState(month);
  if (renderedForMonth !== month) {
    setRenderedForMonth(month);
    setContent(initialContent ?? "");
    setEditing(false);
    setError(null);
  }

  useEffect(() => {
    if (!editing || !containerRef.current) return;
    let disposed = false;

    import("@toast-ui/editor").then(({ default: Editor }) => {
      if (disposed || !containerRef.current) return;
      editorRef.current = new Editor({
        el: containerRef.current,
        height: "220px",
        initialEditType: "wysiwyg",
        previewStyle: "vertical",
        initialValue: content,
        usageStatistics: false,
        toolbarItems: [
          ["heading", "bold", "italic"],
          ["ul", "ol", "task"],
        ],
      });
    });

    return () => {
      disposed = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function handleSave() {
    const markdown = editorRef.current?.getMarkdown() ?? "";
    setSaving(true);
    setError(null);
    try {
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
      editorRef.current?.destroy();
      editorRef.current = null;
      setEditing(false);
    } catch {
      setError("네트워크 오류로 메모를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    editorRef.current?.destroy();
    editorRef.current = null;
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

      {editing ? (
        <div className="flex flex-col gap-3">
          <div ref={containerRef} />
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
        </div>
      ) : content ? (
        <MarkdownView content={content} />
      ) : (
        <p className="text-sm" style={{ color: "var(--dv-text-muted)" }}>
          이번 달 목표나 다짐을 자유롭게 적어보세요.
        </p>
      )}
    </div>
  );
}
