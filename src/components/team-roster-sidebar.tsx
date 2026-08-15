import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { positionLabelByValue } from "@/lib/validation/player";
import type { PlayerPosition } from "@/types/database";
import { FormDialog } from "@/components/form-dialog";
import { CreatePlayerForm } from "@/app/org/[slug]/teams/[teamId]/create-player-form";
import { cn } from "@/lib/utils";

export type RosterSidebarPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: PlayerPosition | null;
  photoUrl: string | undefined;
};

function RosterSidebarAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | undefined;
}) {
  return (
    <span className="relative inline-flex size-8 shrink-0 overflow-hidden rounded-full bg-[#01255f]/10 ring-1 ring-border">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="size-full object-cover object-top" />
      ) : (
        <span className="flex size-full items-center justify-center">
          <UserRound className="size-3.5 text-muted-foreground" />
        </span>
      )}
    </span>
  );
}

export function TeamRosterSidebar({
  slug,
  teamId,
  teamName,
  players,
  canManageRoster,
}: {
  slug: string;
  teamId: string;
  teamName: string;
  players: RosterSidebarPlayer[];
  canManageRoster: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b px-4 py-4">
        <div className="space-y-0.5">
          <p className="font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Roster
          </p>
          <p className="truncate text-sm font-semibold">{teamName}</p>
          <p className="text-xs text-muted-foreground">
            {players.length} player{players.length === 1 ? "" : "s"}
          </p>
        </div>
        {canManageRoster && (
          <FormDialog
            triggerLabel="Add player"
            triggerIcon={<Plus className="size-3.5" />}
            title="Add a player"
            wide
          >
            <CreatePlayerForm slug={slug} teamId={teamId} />
          </FormDialog>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {players.length > 0 ? (
          <ul className="space-y-0.5">
            {players.map((player) => {
              const name = `${player.firstName} ${player.lastName}`;
              const position =
                player.position !== null
                  ? positionLabelByValue.get(player.position)
                  : null;

              return (
                <li key={player.id}>
                  <div
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm",
                    )}
                  >
                    <RosterSidebarAvatar name={name} photoUrl={player.photoUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium leading-tight">{name}</p>
                      {(player.jerseyNumber !== null || position) && (
                        <p className="truncate text-xs text-muted-foreground">
                          {player.jerseyNumber !== null && `#${player.jerseyNumber}`}
                          {player.jerseyNumber !== null && position ? " · " : ""}
                          {position}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No players yet.
            {canManageRoster ? " Add someone to get started." : ""}
          </div>
        )}
      </div>

      <div className="border-t px-4 py-3">
        <Link
          href={`/org/${slug}/teams/${teamId}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Manage roster
        </Link>
      </div>
    </div>
  );
}
