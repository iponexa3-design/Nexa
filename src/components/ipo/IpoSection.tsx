import type { ReactNode } from "react";

type Accent = "blue" | "emerald" | "violet";

const accentStyles: Record<
  Accent,
  { badge: string; bar: string; dot: string; dashed: string }
> = {
  blue: {
    badge: "bg-blue-50 text-blue-600",
    bar: "bg-blue-500",
    dot: "bg-blue-500",
    dashed: "border-blue-200 bg-blue-50/50",
  },
  emerald: {
    badge: "bg-emerald-50 text-emerald-600",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    dashed: "border-emerald-200 bg-emerald-50/50",
  },
  violet: {
    badge: "bg-violet-50 text-violet-600",
    bar: "bg-violet-500",
    dot: "bg-violet-500",
    dashed: "border-violet-200 bg-violet-50/50",
  },
};

export function IpoSection({
  title,
  description,
  accent = "blue",
  icon,
  children,
}: {
  title: string;
  description?: string;
  accent?: Accent;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const styles = accentStyles[accent];

  return (
    <section className="mb-12">
      <div className="mb-5 flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.badge}`}
        >
          {icon}
        </span>
        <div>
          <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
          {description ? (
            <p className="text-sm text-zinc-500">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  message,
  accent = "blue",
}: {
  message: string;
  accent?: Accent;
}) {
  const styles = accentStyles[accent];

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-zinc-500 ${styles.dashed}`}
    >
      <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
      {message}
    </div>
  );
}
