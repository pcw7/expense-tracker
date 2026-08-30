"use client";

// BlockNote 에디터는 생성 시점에 window에 접근하기 때문에 서버 렌더링에서
// 제외해야 한다. next/dynamic의 ssr:false는 서버 컴포넌트에서 직접 쓸 수
// 없으므로, "use client" 파일인 이 래퍼를 한 겹 두어 처리한다.
import dynamic from "next/dynamic";

const MonthlyNoteInner = dynamic(
  () => import("./monthly-note").then((mod) => mod.MonthlyNote),
  { ssr: false }
);

export function MonthlyNote(props: { month: string; initialContent: string | null }) {
  return <MonthlyNoteInner {...props} />;
}
