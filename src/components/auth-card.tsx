import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  description,
  centered = false,
  children,
  className,
}: {
  title: string;
  description?: string;
  centered?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full gap-6 rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl shadow-black/20 backdrop-blur-md",
        className,
      )}
    >
      <div className={cn("space-y-1.5", centered && "text-center")}>
        <h1 className="font-heading text-2xl font-semibold uppercase tracking-tight text-balance">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
