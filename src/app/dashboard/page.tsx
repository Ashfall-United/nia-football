import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Shield } from "lucide-react";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { listOrganisationsForUser } from "@/domain/organisations/queries";
import { StadiumShell } from "@/components/stadium-shell";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  const organisations = await listOrganisationsForUser(user.id);

  if (organisations.length === 0) {
    redirect("/onboarding");
  }

  return (
    <StadiumShell contentClassName="items-center justify-center px-6 py-10 lg:px-10">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
            Your teams
          </h1>
          <p className="text-sm text-white/60">{user.email}</p>
        </div>

        <ul className="space-y-3">
          {organisations.map((org) => (
            <li key={org.id}>
              <Link
                href={`/org/${org.slug}`}
                className={cn(
                  "group flex items-center gap-4 rounded-xl border border-white/10 bg-white/10 px-4 py-4",
                  "backdrop-blur-md transition-colors hover:border-white/20 hover:bg-white/15",
                )}
              >
                <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
                  {org.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={org.logoUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <Shield className="size-5 text-white/80" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">
                    {org.name}
                  </span>
                  <span className="block text-xs capitalize text-white/50">
                    {org.role}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </StadiumShell>
  );
}
