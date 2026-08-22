import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div
      className="flex flex-col items-start gap-2 rounded-lg border border-dashed px-4 py-6 text-sm"
      style={{
        borderColor: "var(--dv-grid)",
        color: "var(--dv-text-secondary)",
      }}
    >
      <p className="font-medium" style={{ color: "var(--dv-text-primary)" }}>
        {title}
      </p>
      <p>{description}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-1 text-sm font-medium underline underline-offset-2"
          style={{ color: "var(--dv-series-1)" }}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
