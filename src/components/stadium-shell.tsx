import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StadiumShell({
  children,
  headerAction,
  showFooter = true,
  contentClassName,
}: {
  children: ReactNode;
  headerAction?: ReactNode;
  showFooter?: boolean;
  contentClassName?: string;
}) {
  return (
    <main className="relative flex min-h-svh flex-1 flex-col overflow-hidden">
      <Image
        src="/stadium.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/65 to-black/85"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)]"
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <Link
          href="/"
          className="font-heading text-lg font-semibold uppercase tracking-[0.12em] text-white"
        >
          Nia Football
        </Link>
        {headerAction}
      </header>

      <div
        className={cn("relative z-10 flex flex-1 flex-col", contentClassName)}
      >
        {children}
      </div>

      {showFooter && (
        <footer className="relative z-10 border-t border-white/10 bg-black/25 px-6 py-5 backdrop-blur-sm lg:px-10">
          <p className="text-center text-xs text-white/40">
            ©{" "}
            <span suppressHydrationWarning>{new Date().getFullYear()}</span> Nia
            Football
          </p>
        </footer>
      )}
    </main>
  );
}
