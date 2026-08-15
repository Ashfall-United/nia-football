import Link from "next/link";
import { ChevronLeft, LogOut, Shield } from "lucide-react";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { MEMBER_MANAGEMENT_ROLES, ANALYSIS_MANAGEMENT_ROLES, MEDIA_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { signOut } from "@/lib/auth/actions";
import { OrgSidebarNav } from "./org-sidebar-nav";
import { OrgMobileNav } from "./org-mobile-nav";

export default async function OrgLayout(
  props: LayoutProps<"/org/[slug]">,
) {
  const { slug } = await props.params;
  const membership = await requireOrganisationBySlug(slug);
  const user = await requireAuthenticatedUser();
  const showStaffNav = MEMBER_MANAGEMENT_ROLES.includes(membership.role);
  const showAnalysisNav = ANALYSIS_MANAGEMENT_ROLES.includes(membership.role);
  const showSettingsNav = MEMBER_MANAGEMENT_ROLES.includes(membership.role);
  const showLiveNav = MEDIA_MANAGEMENT_ROLES.includes(membership.role);

  return (
    <div className="flex min-h-svh w-full flex-1 bg-muted/30">
      <aside className="hidden min-h-svh w-64 shrink-0 flex-col bg-[#01255f] text-white lg:flex">
        <div className="border-b border-white/10 px-4 py-5">
          <Link
            href="/dashboard"
            className="mb-5 flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white"
          >
            <ChevronLeft className="size-3.5" />
            Switch organisation
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/10">
              {membership.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={membership.logoUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <Shield className="size-5 text-white/80" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {membership.name}
              </p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
              <p className="text-xs capitalize text-white/50">
                {membership.role}
              </p>
            </div>
          </div>
        </div>

        <OrgSidebarNav
          slug={slug}
          showStaffNav={showStaffNav}
          showAnalysisNav={showAnalysisNav}
          showSettingsNav={showSettingsNav}
          showLiveNav={showLiveNav}
        />

        <div className="mt-auto shrink-0 border-t border-white/10 px-3 py-4 pb-6">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-sm lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#01255f]/10">
              {membership.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={membership.logoUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <Shield className="size-4 text-[#01255f]" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {membership.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
              <p className="text-xs capitalize text-muted-foreground">
                {membership.role}
              </p>
            </div>
          </div>
          <OrgMobileNav
            slug={slug}
            showStaffNav={showStaffNav}
            showAnalysisNav={showAnalysisNav}
            showSettingsNav={showSettingsNav}
            showLiveNav={showLiveNav}
          />
        </header>
        <div className="flex min-h-0 flex-1 flex-col bg-muted/30">
          {props.children}
        </div>
      </div>
    </div>
  );
}
