"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, UserRound } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { CreatePlayerForm } from "./teams/[teamId]/create-player-form";
import { extractTeamIdFromPath } from "./org-sidebar-nav";

type RosterPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: string | null;
  photoUrl: string | null;
};

type RosterPayload = {
  teamName: string;
  canManageRoster: boolean;
  players: RosterPlayer[];
};

function SidebarPlayerAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  return (
    <span className="relative inline-flex size-7 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="size-full object-cover object-top" />
      ) : (
        <span className="flex size-full items-center justify-center">
          <UserRound className="size-3.5 text-white/50" />
        </span>
      )}
    </span>
  );
}

export function OrgSidebarRoster({ slug }: { slug: string }) {
  const pathname = usePathname();
  const teamId = extractTeamIdFromPath(pathname, slug);
  const [roster, setRoster] = useState<RosterPayload | null>(null);

  useEffect(() => {
    if (!teamId || pathname.includes("/capture")) {
      setRoster(null);
      return;
    }

    let cancelled = false;

    void fetch(`/api/org/${slug}/teams/${teamId}/roster`)
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as RosterPayload;
      })
      .then((payload) => {
        if (!cancelled) {
          setRoster(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoster(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, slug, teamId]);

  if (!teamId || !roster) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-white/10">
      <div className="space-y-2 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
            Roster
          </p>
          <p className="truncate text-sm font-semibold text-white">
            {roster.teamName}
          </p>
          <p className="text-xs text-white/50">
            {roster.players.length} player{roster.players.length === 1 ? "" : "s"}
          </p>
        </div>
        {roster.canManageRoster ? (
          <FormDialog
            triggerLabel="Add player"
            triggerIcon={<Plus className="size-3.5" />}
            title="Add a player"
            wide
            triggerClassName="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <CreatePlayerForm slug={slug} teamId={teamId} />
          </FormDialog>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {roster.players.length > 0 ? (
          <ul className="space-y-0.5">
            {roster.players.map((player) => {
              const name = `${player.firstName} ${player.lastName}`;
              return (
                <li key={player.id}>
                  <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                    <SidebarPlayerAvatar
                      name={name}
                      photoUrl={player.photoUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white/90">
                        {name}
                      </p>
                      {player.jerseyNumber !== null || player.position ? (
                        <p className="truncate text-[10px] text-white/50">
                          {player.jerseyNumber !== null && `#${player.jerseyNumber}`}
                          {player.jerseyNumber !== null && player.position
                            ? " · "
                            : ""}
                          {player.position}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-2 py-4 text-center text-xs text-white/50">
            No players yet.
          </p>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <Link
          href={`/org/${slug}/teams/${teamId}`}
          className="text-xs font-medium text-[#f5c400] hover:underline"
        >
          Manage roster
        </Link>
      </div>
    </div>
  );
}
