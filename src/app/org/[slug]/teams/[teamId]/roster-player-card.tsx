"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { deletePlayerAction } from "@/domain/players/actions";
import type { Player } from "@/domain/players/types";
import { FormDialogCloseProvider } from "@/components/form-dialog";
import { EditPlayerForm } from "./edit-player-form";
import { PlayerCard } from "./player-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function RosterPlayerCard({
  slug,
  teamId,
  player,
  photoUrl,
}: {
  slug: string;
  teamId: string;
  player: Player;
  photoUrl: string | undefined;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Remove ${player.firstName} ${player.lastName} from the roster?`,
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deletePlayerAction(slug, teamId, player.id);
      if (result.error) {
        window.alert(result.error);
      }
    });
  }

  return (
    <div className="group/card relative">
      <PlayerCard player={player} photoUrl={photoUrl} />

      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover/card:opacity-100 focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="size-8 bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                disabled={pending}
              />
            }
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Edit player
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[min(90vh,800px)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit player</DialogTitle>
          </DialogHeader>
          <FormDialogCloseProvider close={() => setEditOpen(false)}>
            <EditPlayerForm
              slug={slug}
              teamId={teamId}
              player={player}
              photoUrl={photoUrl}
            />
          </FormDialogCloseProvider>
        </DialogContent>
      </Dialog>
    </div>
  );
}
