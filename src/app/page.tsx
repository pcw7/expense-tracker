import Link from "next/link";

const sections = [
  {
    href: "/dashboard",
    title: "대시보드",
    description: "카테고리별·기간별 지출 통계를 한눈에 확인합니다.",
  },
  {
    href: "/expenses",
    title: "지출 내역",
    description: "지출을 기록하고 목록을 확인·수정합니다.",
  },
  {
    href: "/budgets",
    title: "예산",
    description: "월별 예산을 설정하고 사용 현황을 관리합니다.",
  },
  {
    href: "/reports",
    title: "AI 리포트",
    description: "AI가 생성한 월간 소비 인사이트를 확인합니다.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">가계부</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          지출을 기록하고, 카테고리별/기간별 통계를 보고, AI 월간 소비
          리포트를 받아보세요.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex flex-col gap-1 rounded-lg border border-sky-900/12 p-5 transition-colors hover:bg-sky-500/5 dark:border-indigo-200/15 dark:hover:bg-indigo-300/10"
          >
            <span className="font-medium">{section.title}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {section.description}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
