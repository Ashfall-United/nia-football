"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import type { Player } from "@/domain/players/types";
import { positionLabelByValue, positionOptions } from "@/lib/validation/player";
import { EmptyState } from "@/components/empty-state";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerCard, PlayerCardGrid } from "../teams/[teamId]/player-card";
import { RosterPlayerCard } from "../teams/[teamId]/roster-player-card";

const ALL_POSITIONS = "all";
const UNASSIGNED_POSITION = "unassigned";

type RosterPlayer = Player & {
  photoUrl: string | undefined;
};

function RosterFilters({
  slug,
  teamId,
  teams,
  positionFilter,
  onPositionFilterChange,
  hasPlayers,
}: {
  slug: string;
  teamId: string;
  teams: ReadonlyArray<{ id: string; name: string }>;
  positionFilter: string;
  onPositionFilterChange: (value: string) => void;
  hasPlayers: boolean;
}) {
  const router = useRouter();
  const showTeamFilter = teams.length > 1;

  if (!showTeamFilter && !hasPlayers) {
    return null;
  }

  const teamOptions = teams.map((team) => ({
    value: team.id,
    label: team.name,
  }));

  const positionFilterOptions = [
    { value: ALL_POSITIONS, label: "All positions" },
    { value: UNASSIGNED_POSITION, label: "Unassigned" },
    ...positionOptions.map((option) => ({
      value: option.value,
      label: positionLabelByValue.get(option.value) ?? option.label,
    })),
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      {showTeamFilter ? (
        <div className="flex w-full max-w-sm flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <Label htmlFor="roster-team-filter" className="shrink-0 text-sm">
            Team
          </Label>
          <Select
            value={teamId}
            onValueChange={(nextTeamId) => {
              router.push(`/org/${slug}/roster?team=${nextTeamId}`);
            }}
            items={teamOptions}
          >
            <SelectTrigger id="roster-team-filter" className="w-full sm:w-64">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {teamOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {hasPlayers ? (
        <div className="flex w-full max-w-sm flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <Label htmlFor="roster-position-filter" className="shrink-0 text-sm">
            Position
          </Label>
          <Select
            value={positionFilter}
            onValueChange={(value) => {
              if (value) {
                onPositionFilterChange(value);
              }
            }}
            items={positionFilterOptions}
          >
            <SelectTrigger id="roster-position-filter" className="w-full sm:w-64">
              <SelectValue placeholder="All positions" />
            </SelectTrigger>
            <SelectContent>
              {positionFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

export function RosterView({
  slug,
  teamId,
  teams,
  players,
  canManageRoster,
}: {
  slug: string;
  teamId: string;
  teams: ReadonlyArray<{ id: string; name: string }>;
  players: RosterPlayer[];
  canManageRoster: boolean;
}) {
  const [positionFilter, setPositionFilter] = useState(ALL_POSITIONS);

  const filteredPlayers = useMemo(() => {
    if (positionFilter === ALL_POSITIONS) {
      return players;
    }
    if (positionFilter === UNASSIGNED_POSITION) {
      return players.filter((player) => player.position === null);
    }
    return players.filter((player) => player.position === positionFilter);
  }, [players, positionFilter]);

  const hasPlayers = players.length > 0;

  return (
    <div className="space-y-6">
      <RosterFilters
        slug={slug}
        teamId={teamId}
        teams={teams}
        positionFilter={positionFilter}
        onPositionFilterChange={setPositionFilter}
        hasPlayers={hasPlayers}
      />

      {!hasPlayers ? (
        <EmptyState
          icon={UserRound}
          title="No players yet"
          description={
            canManageRoster
              ? "Use the Add player button above to start building this team's roster."
              : "An owner, admin, or coach hasn't added any players yet."
          }
        />
      ) : filteredPlayers.length > 0 ? (
        <PlayerCardGrid>
          {filteredPlayers.map((player) => (
            <li key={player.id}>
              {canManageRoster ? (
                <RosterPlayerCard
                  slug={slug}
                  teamId={teamId}
                  player={player}
                  photoUrl={player.photoUrl}
                />
              ) : (
                <PlayerCard player={player} photoUrl={player.photoUrl} />
              )}
            </li>
          ))}
        </PlayerCardGrid>
      ) : (
        <EmptyState
          icon={UserRound}
          title="No players match this position"
          description="Try another position or reset the filter to All positions."
        />
      )}
    </div>
  );
}
