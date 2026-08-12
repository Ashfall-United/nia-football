import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Nia Football
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The operating system for football development in Africa.
          Organisation workspaces are not built yet.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login" className={buttonVariants()}>
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className={buttonVariants({ variant: "outline" })}
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
