import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StadiumShell } from "@/components/stadium-shell";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <StadiumShell
      headerAction={
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-white/80 hover:bg-white/10 hover:text-white",
          )}
        >
          Sign in
        </Link>
      }
      contentClassName="items-center justify-center px-6 pb-10 pt-6 text-center lg:px-10"
    >
      <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="font-heading text-5xl font-bold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
          The operating system for football in Africa
        </h1>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
          Capture sessions, livestream from the pitch, clip key moments, and
          build structured football intelligence for your team.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "min-w-40 bg-white text-primary hover:bg-white/90",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "min-w-40 border-white/30 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 hover:text-white",
            )}
          >
            Create account
          </Link>
        </div>
      </div>
    </StadiumShell>
  );
}
