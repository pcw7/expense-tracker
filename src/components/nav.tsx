import Link from "next/link";

const links = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/expenses", label: "지출 내역" },
  { href: "/budgets", label: "예산" },
  { href: "/reports", label: "AI 리포트" },
];

export function Nav() {
  return (
    <header className="border-b border-black/[.08] dark:border-white/[.145]">
      <div className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          가계부
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
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
