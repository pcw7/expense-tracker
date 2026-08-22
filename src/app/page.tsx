import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMonthlyStats, currentMonthString } from "@/lib/stats";
import { formatMonthShort } from "@/lib/format";
import { DonutChart } from "./_components/donut-chart";
import { AiTeaser } from "./_components/ai-teaser";

// 이 페이지는 요청마다 최신 지출/리포트 데이터를 읽어야 하므로, 빌드 시점
// 데이터로 고정되는 정적 프리렌더를 명시적으로 끈다.
export const dynamic = "force-dynamic";

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

export default async function Home() {
  const month = currentMonthString();
  const [stats, report] = await Promise.all([
    getMonthlyStats(month),
    prisma.monthlyReport.findUnique({ where: { month } }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <section className="dv-root flex flex-col gap-6 rounded-2xl border border-sky-900/12 bg-white/55 p-6 backdrop-blur-md dark:border-indigo-200/15 dark:bg-white/5">
        <h1 className="text-2xl font-bold tracking-tight">
          {formatMonthShort(month)} 지출내역
        </h1>
        <DonutChart items={stats.categoryBreakdown} total={stats.totalAmount} />
        <AiTeaser reportContent={report?.content ?? null} />
      </section>

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
