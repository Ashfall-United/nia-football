import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, Shield, Users } from "lucide-react";
import type { TeamWithStats } from "@/domain/teams/types";
import { cn } from "@/lib/utils";

function TeamStatBadge({
  icon: Icon,
  label,
}: {
  icon: typeof Users;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/10">
      <Icon className="size-3 shrink-0" />
      {label}
    </span>
  );
}

function TeamTypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#f5c400]/20 px-2.5 py-1 text-xs font-semibold text-[#f5c400] ring-1 ring-[#f5c400]/30">
      {label}
    </span>
  );
}

function LogoWatermark({ logoUrl }: { logoUrl: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-52 -translate-x-1/2 -translate-y-[58%] object-contain opacity-[0.14] transition-transform duration-300 group-hover/card:scale-105 sm:size-60"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -bottom-8 size-36 object-contain opacity-[0.07] sm:size-44"
      />
    </>
  );
}

export function TeamCard({
  team,
  slug,
  logoUrl,
  organisationTypeLabel,
}: {
  team: TeamWithStats;
  slug: string;
  logoUrl: string | null;
  organisationTypeLabel: string;
}) {
  const createdYear = new Date(team.createdAt).getFullYear();

  return (
    <Link
      href={`/org/${slug}/roster?team=${team.id}`}
      className="group/card block h-full"
    >
      <article className="relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl bg-[#01255f] shadow-md ring-1 ring-black/5 transition-shadow hover:shadow-lg sm:min-h-[320px]">
        {logoUrl ? (
          <LogoWatermark logoUrl={logoUrl} />
        ) : (
          <>
            <Shield
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 size-44 -translate-x-1/2 -translate-y-[58%] text-white/[0.07] transition-transform duration-300 group-hover/card:scale-105 sm:size-52"
              strokeWidth={1.25}
            />
            <Shield
              aria-hidden="true"
              className="pointer-events-none absolute -right-6 -bottom-8 size-32 text-white/[0.04] sm:size-40"
              strokeWidth={1}
            />
          </>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#01255f] via-[#01255f]/80 to-[#01255f]/25"
        />

        <div className="relative flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10 sm:size-16">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <Shield className="size-7 text-[#f5c400] sm:size-8" />
              )}
            </span>
            <TeamTypeBadge label={organisationTypeLabel} />
          </div>

          <div className="mt-auto space-y-4 pt-6">
            <div className="flex flex-wrap gap-2">
              <TeamStatBadge
                icon={Users}
                label={
                  team.playerCount === 1
                    ? "1 player"
                    : `${team.playerCount} players`
                }
              />
              <TeamStatBadge
                icon={CalendarDays}
                label={
                  team.sessionCount === 1
                    ? "1 session"
                    : `${team.sessionCount} sessions`
                }
              />
            </div>

            <div>
              <p className="font-heading text-2xl font-semibold uppercase tracking-wide text-white sm:text-3xl">
                {team.name}
              </p>
              <p className="mt-1.5 text-sm text-white/50">
                Team since {createdYear}
              </p>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function TeamCardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {children}
    </ul>
  );
}
