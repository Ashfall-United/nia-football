"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Film,
  LayoutDashboard,
  ListFilter,
  ListMusic,
  Radio,
  Settings,
  Shield,
  Sparkles,
  UserRound,
  Users,
  Video,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  exact: boolean;
  icon: LucideIcon;
};

export type OrgNavSection = {
  backHref?: string;
  backLabel?: string;
  items: NavItem[];
};

function extractTeamId(pathname: string, slug: string): string | null {
  const match = pathname.match(new RegExp(`^/org/${slug}/teams/([^/]+)`));
  return match?.[1] ?? null;
}

export function getOrgNavSection(
  pathname: string,
  slug: string,
  options: {
    showStaffNav?: boolean;
    showAnalysisNav?: boolean;
    showSettingsNav?: boolean;
    showLiveNav?: boolean;
  } = {},
): OrgNavSection {
  const {
    showStaffNav = false,
    showAnalysisNav = false,
    showSettingsNav = false,
    showLiveNav = false,
  } = options;
  const teamId = extractTeamId(pathname, slug);

  if (teamId) {
    return {
      backHref: `/org/${slug}/teams`,
      backLabel: "Teams",
      items: [
        {
          href: `/org/${slug}/teams/${teamId}/sessions`,
          label: "Sessions",
          exact: false,
          icon: CalendarDays,
        },
        ...(showAnalysisNav
          ? [
              {
                href: `/org/${slug}/teams/${teamId}/compare`,
                label: "Compare",
                exact: true,
                icon: BarChart3,
              } satisfies NavItem,
            ]
          : []),
      ],
    };
  }

  return {
    items: [
      {
        href: `/org/${slug}`,
        label: "Overview",
        exact: true,
        icon: LayoutDashboard,
      },
      {
        href: `/org/${slug}/teams`,
        label: "Teams",
        exact: true,
        icon: Shield,
      },
      {
        href: `/org/${slug}/roster`,
        label: "Roster",
        exact: false,
        icon: UserRound,
      },
      {
        href: `/org/${slug}/clips`,
        label: "Clips",
        exact: true,
        icon: Film,
      },
      {
        href: `/org/${slug}/playlists`,
        label: "Playlists",
        exact: true,
        icon: ListMusic,
      },
      {
        href: `/org/${slug}/cameras`,
        label: "Cameras",
        exact: true,
        icon: Video,
      },
      ...(showLiveNav
        ? [
            {
              href: `/org/${slug}/live`,
              label: "Live monitor",
              exact: true,
              icon: Radio,
            } satisfies NavItem,
          ]
        : []),
      ...(showAnalysisNav
        ? [
            {
              href: `/org/${slug}/events`,
              label: "Events",
              exact: true,
              icon: ListFilter,
            } satisfies NavItem,
            {
              href: `/org/${slug}/review`,
              label: "AI review",
              exact: true,
              icon: Sparkles,
            } satisfies NavItem,
          ]
        : []),
      ...(showStaffNav
        ? [
            {
              href: `/org/${slug}/staff`,
              label: "Staff",
              exact: true,
              icon: Users,
            } satisfies NavItem,
          ]
        : []),
      ...(showSettingsNav
        ? [
            {
              href: `/org/${slug}/settings`,
              label: "Settings",
              exact: true,
              icon: Settings,
            } satisfies NavItem,
          ]
        : []),
    ],
  };
}

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function OrgSidebarNav({
  slug,
  showStaffNav = false,
  showAnalysisNav = false,
  showSettingsNav = false,
  showLiveNav = false,
}: {
  slug: string;
  showStaffNav?: boolean;
  showAnalysisNav?: boolean;
  showSettingsNav?: boolean;
  showLiveNav?: boolean;
}) {
  const pathname = usePathname();
  const section = getOrgNavSection(pathname, slug, {
    showStaffNav,
    showAnalysisNav,
    showSettingsNav,
    showLiveNav,
  });

  return (
    <nav className="flex shrink-0 flex-col gap-1 px-3 py-4">
      {section.backHref && (
        <Link
          href={section.backHref}
          className="mb-3 flex items-center gap-1.5 px-3 text-xs text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          {section.backLabel}
        </Link>
      )}
      {section.items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-white/20 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <item.icon
              className={cn("size-4 shrink-0", active ? "text-white" : "text-white/60")}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
