"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { deleteCameraAction } from "@/domain/cameras/actions";
import type {
  Camera,
  CameraLiveStatus,
  CameraStreamCredentials,
} from "@/domain/cameras/types";
import { FormDialogCloseProvider } from "@/components/form-dialog";
import { CameraCard } from "./camera-card";
import { EditCameraForm } from "./edit-camera-form";
import { StreamCredentialsButton } from "./stream-credentials-button";
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

export function ManageCameraCard({
  slug,
  camera,
  liveStatus,
  credentials,
}: {
  slug: string;
  camera: Camera;
  liveStatus?: CameraLiveStatus;
  credentials?: CameraStreamCredentials | null;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const connected = Boolean(camera.streamLiveInputId);
    const confirmed = window.confirm(
      connected
        ? `Remove "${camera.name}"? This will disconnect it from Stream and delete any videos recorded with this camera.`
        : `Remove "${camera.name}"? Any videos recorded with this camera will also be deleted.`,
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCameraAction(slug, camera.id);
      if (result.error) {
        window.alert(result.error);
      }
    });
  }

  return (
    <div className="group/card relative">
      <CameraCard
        camera={camera}
        slug={slug}
        canManage
        liveStatus={liveStatus}
        footer={
          credentials ? (
            <StreamCredentialsButton credentials={credentials} />
          ) : undefined
        }
      />

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
              Edit camera
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Remove camera
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[min(90vh,800px)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit camera</DialogTitle>
          </DialogHeader>
          <FormDialogCloseProvider close={() => setEditOpen(false)}>
            <EditCameraForm slug={slug} camera={camera} />
          </FormDialogCloseProvider>
        </DialogContent>
      </Dialog>
    </div>
  );
}
