"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import type { CameraStreamCredentials } from "@/domain/cameras/types";
import { StreamCredentialsPanel } from "./stream-credentials-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function StreamCredentialsButton({
  credentials,
}: {
  credentials: CameraStreamCredentials;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="w-full bg-white/15 text-white hover:bg-white/25"
        onClick={() => setOpen(true)}
      >
        <KeyRound className="size-4" />
        Stream credentials
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(90vh,800px)] overflow-y-auto border-[#01255f] bg-[#01255f] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Encoder credentials</DialogTitle>
          </DialogHeader>
          <StreamCredentialsPanel credentials={credentials} />
        </DialogContent>
      </Dialog>
    </>
  );
}
