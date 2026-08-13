"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { deleteSessionAction } from "@/domain/sessions/actions";
import type { Session } from "@/domain/sessions/types";
import { FormDialogCloseProvider } from "@/components/form-dialog";
import { EditSessionForm } from "../edit-session-form";
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

export function SessionDetailMenu({
  slug,
  teamId,
  session,
  readyVideos,
}: {
  slug: string;
  teamId: string;
  session: Session;
  readyVideos: number;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const title =
    session.type === "match" ? `vs ${session.opponentName}` : "Training";

  function handleDelete() {
    const confirmed = window.confirm(
      readyVideos > 0
        ? `Remove "${title}"? This will delete ${readyVideos === 1 ? "its recording" : `all ${readyVideos} recordings`}, clips, and events on this session.`
        : `Remove "${title}"?`,
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteSessionAction(slug, teamId, session.id);
      if (result?.error) {
        window.alert(result.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={pending}
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit session
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="size-4" />
            Remove session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[min(90vh,800px)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit session</DialogTitle>
          </DialogHeader>
          <FormDialogCloseProvider close={() => setEditOpen(false)}>
            <EditSessionForm slug={slug} teamId={teamId} session={session} />
          </FormDialogCloseProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}
