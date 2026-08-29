import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { ensureRecurringExpensesForMonth } from "@/lib/recurring";
import { currentMonthString } from "@/lib/date";
import "./globals.css";
import "./dataviz.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "가계부",
  description: "지출 기록, 통계, AI 월간 소비 리포트를 제공하는 개인 가계부",
};

// 매 요청마다 이번 달 고정지출을 생성해야 하므로(빌드 시 한 번만 실행되는
// 정적 렌더링을 방지) 레이아웃 전체를 동적으로 강제한다.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await ensureRecurringExpensesForMonth(currentMonthString());

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="sky-backdrop" aria-hidden="true" />
        <Nav />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
