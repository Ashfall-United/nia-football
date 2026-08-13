import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { StadiumShell } from "@/components/stadium-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Page not found · Nia Football",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <StadiumShell contentClassName="items-center justify-center px-6 py-10 text-center lg:px-10">
      <div className="max-w-lg space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.3em] text-[#f5c400]">
          404
        </p>
        <div className="space-y-3">
          <h1 className="font-heading text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl">
            Out of bounds
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            This page doesn&apos;t exist, or you don&apos;t have access to it.
            Check the URL or head back to your workspace.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ size: "lg" }),
              "min-w-44 bg-white text-primary hover:bg-white/90",
            )}
          >
            <LayoutDashboard className="size-4" />
            Your workspace
          </Link>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "min-w-44 border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white",
            )}
          >
            <ArrowLeft className="size-4" />
            Home
          </Link>
        </div>
      </div>
    </StadiumShell>
  );
}
