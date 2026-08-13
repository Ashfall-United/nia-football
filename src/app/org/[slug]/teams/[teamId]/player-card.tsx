import type { ReactNode } from "react";
import { UserRound } from "lucide-react";
import type { Player } from "@/domain/players/types";
import { positionLabelByValue } from "@/lib/validation/player";
import { cn } from "@/lib/utils";

export function PlayerCard({
  player,
  photoUrl,
}: {
  player: Player;
  photoUrl: string | undefined;
}) {
  const position =
    player.position !== null
      ? positionLabelByValue.get(player.position)
      : null;
  const number =
    player.jerseyNumber !== null ? String(player.jerseyNumber) : null;

  return (
    <article className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-[#01255f] shadow-md ring-1 ring-black/5">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 size-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#01255f]">
          <UserRound className="size-16 text-white/20" />
        </div>
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#01255f] via-[#01255f]/80 to-transparent"
      />

      {number && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-8 left-3 font-heading text-7xl font-bold leading-none text-white/10 select-none"
        >
          {number}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <div className="min-w-0">
          {number && (
            <p className="font-heading text-3xl font-bold leading-none text-[#f5c400]">
              {number}
            </p>
          )}
          <p className="mt-1 truncate font-heading text-sm font-semibold uppercase tracking-wide text-white">
            {player.firstName} {player.lastName}
          </p>
        </div>
        {position && (
          <span className="shrink-0 rounded bg-[#f5c400] px-2 py-1 font-heading text-xs font-bold text-[#01255f]">
            {position}
          </span>
        )}
      </div>
    </article>
  );
}

export function PlayerCardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        className,
      )}
    >
      {children}
    </ul>
  );
}
