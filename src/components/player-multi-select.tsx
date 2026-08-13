"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlayerOption = {
  id: string;
  name: string;
  photoUrl?: string;
  jerseyNumber: number | null;
};

export function PlayerAvatar({
  name,
  photoUrl,
  jerseyNumber,
  size = "md",
}: {
  name: string;
  photoUrl?: string;
  jerseyNumber?: number | null;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "size-7" : "size-9";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-[#01255f]/10 ring-1 ring-border",
        sizeClass,
      )}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="size-full object-cover object-top" />
      ) : (
        <span className="flex size-full items-center justify-center">
          <UserRound
            className={cn(
              "text-muted-foreground",
              size === "sm" ? "size-3.5" : "size-4",
            )}
          />
        </span>
      )}
      {jerseyNumber != null && size === "md" && (
        <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[#f5c400] text-[9px] font-bold text-[#01255f] ring-1 ring-background">
          {jerseyNumber}
        </span>
      )}
    </span>
  );
}

export function PlayerMultiSelect({
  players,
  selectedIds,
  onChange,
  disabled = false,
}: {
  players: PlayerOption[];
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedPlayers = players.filter((player) => selectedIds.has(player.id));

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function togglePlayer(playerId: string) {
    const next = new Set(selectedIds);
    if (next.has(playerId)) next.delete(playerId);
    else next.add(playerId);
    onChange(next);
  }

  function removePlayer(playerId: string) {
    const next = new Set(selectedIds);
    next.delete(playerId);
    onChange(next);
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
          {selectedPlayers.length === 0 ? (
            <span className="text-muted-foreground">Select players</span>
          ) : (
            <>
              <span className="flex -space-x-2">
                {selectedPlayers.slice(0, 4).map((player) => (
                  <PlayerAvatar
                    key={player.id}
                    name={player.name}
                    photoUrl={player.photoUrl}
                    size="sm"
                  />
                ))}
              </span>
              <span className="truncate">
                {selectedPlayers.length === 1
                  ? selectedPlayers[0]?.name
                  : `${selectedPlayers.length} players selected`}
              </span>
            </>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="max-h-56 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md ring-1 ring-foreground/10">
          {players.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No players on this team yet.
            </p>
          ) : (
            players.map((player) => {
              const checked = selectedIds.has(player.id);
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => togglePlayer(player.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    checked && "bg-accent/60",
                  )}
                >
                  <PlayerAvatar
                    name={player.name}
                    photoUrl={player.photoUrl}
                    jerseyNumber={player.jerseyNumber}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {player.name}
                  </span>
                  {player.jerseyNumber != null && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                      #{player.jerseyNumber}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {selectedPlayers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedPlayers.map((player) => (
            <span
              key={player.id}
              className="inline-flex items-center gap-2 rounded-full bg-muted py-1 pl-1 pr-2 text-sm ring-1 ring-border"
            >
              <PlayerAvatar
                name={player.name}
                photoUrl={player.photoUrl}
                size="sm"
              />
              <span className="max-w-[8rem] truncate">{player.name}</span>
              <button
                type="button"
                aria-label={`Remove ${player.name}`}
                disabled={disabled}
                onClick={() => removePlayer(player.id)}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
