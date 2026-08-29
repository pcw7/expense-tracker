import Link from "next/link";

const links = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/expenses", label: "지출 내역" },
  { href: "/recurring", label: "고정지출" },
  { href: "/budgets", label: "예산" },
  { href: "/reports", label: "AI 리포트" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b border-sky-900/12 bg-white/55 backdrop-blur-md dark:border-indigo-200/15 dark:bg-[#0b1130]/60">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
        {/* 해 (라이트 모드) */}
        <span
          aria-hidden="true"
          className="inline-block h-6 w-6 shrink-0 rounded-full dark:hidden"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #fff6d8, #ffd45f 60%, #f7a832 100%)",
            boxShadow: "0 0 14px 2px rgba(255, 196, 84, 0.65)",
          }}
        />
        {/* 달 (다크 모드) */}
        <span
          aria-hidden="true"
          className="hidden h-6 w-6 shrink-0 rounded-full dark:inline-block"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #fdf6e3, #cfd3ea 55%, #9aa0c9 100%)",
            boxShadow: "0 0 12px 2px rgba(205, 210, 255, 0.45)",
          }}
        />
        <Link
          href="/"
          className="bg-gradient-to-r from-sky-600 to-amber-500 bg-clip-text font-semibold tracking-tight text-transparent dark:from-indigo-200 dark:to-amber-100"
        >
          가계부
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-300">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
