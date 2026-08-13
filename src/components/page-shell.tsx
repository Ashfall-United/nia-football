import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const widthClass = {
  full: "",
  sm: "max-w-sm",
  md: "max-w-md",
  "2xl": "max-w-2xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;

export function PageShell({
  children,
  size = "full",
  className,
}: {
  children: ReactNode;
  size?: keyof typeof widthClass;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col gap-6 p-6 lg:p-8",
        widthClass[size],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  titleCase = "uppercase",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  titleCase?: "uppercase" | "sentence";
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="size-5 text-primary" />}
          <h1
            className={cn(
              "font-heading text-2xl font-semibold tracking-tight",
              titleCase === "uppercase" && "uppercase",
            )}
          >
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ListPanel({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-sm">
      {children}
    </ul>
  );
}

export function StatCard({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <p className="mt-3 font-heading text-3xl font-semibold tabular-nums">
        {value}
      </p>
    </Link>
  );
}

export function SummaryStatCard({
  icon: Icon,
  label,
  value,
  hint,
  accentClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  accentClassName?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg bg-primary/10",
            accentClassName,
          )}
        >
          <Icon className="size-4 text-primary" />
        </span>
        <span>{label}</span>
      </div>
      <p className="mt-3 font-heading text-3xl font-semibold tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <Icon className="size-4 text-primary" />
      {children}
    </h2>
  );
}
