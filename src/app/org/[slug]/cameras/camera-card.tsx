import type { ReactNode } from "react";
import { Video } from "lucide-react";
import type { Camera, CameraLiveStatus } from "@/domain/cameras/types";
import { cn } from "@/lib/utils";
import { ConnectCameraButton } from "./connect-camera-button";

function CameraStatusBadge({
  liveStatus,
  hasStreamInput,
}: {
  liveStatus?: CameraLiveStatus;
  hasStreamInput: boolean;
}) {
  if (liveStatus?.state === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white ring-1 ring-red-400/40">
        <span className="size-1.5 animate-pulse rounded-full bg-white" />
        Live
      </span>
    );
  }

  if (hasStreamInput) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-400/30">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Ready
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-100 ring-1 ring-amber-400/25">
      <span className="size-1.5 rounded-full bg-amber-400" />
      Not connected
    </span>
  );
}

export function CameraCard({
  camera,
  slug,
  canManage,
  liveStatus,
  footer,
}: {
  camera: Camera;
  slug: string;
  canManage: boolean;
  liveStatus?: CameraLiveStatus;
  footer?: ReactNode;
}) {
  const hasStreamInput = Boolean(camera.streamLiveInputId);

  return (
    <article className="group relative flex aspect-[4/3] flex-col overflow-hidden rounded-xl bg-[#01255f] shadow-md ring-1 ring-black/5">
      <Video
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-36 -translate-x-1/2 -translate-y-[55%] text-white/[0.07] transition-transform duration-300 group-hover:scale-110"
        strokeWidth={1.25}
      />
      <Video
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -bottom-6 size-28 text-white/[0.04]"
        strokeWidth={1}
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#01255f] via-[#01255f]/75 to-[#01255f]/20"
      />

      <div className="relative flex flex-1 flex-col p-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
          <Video className="size-4 text-[#f5c400]" />
        </span>

        <div className="mt-auto space-y-3">
          <CameraStatusBadge
            liveStatus={liveStatus}
            hasStreamInput={hasStreamInput}
          />
          <div>
            <p className="font-heading text-xl font-semibold uppercase tracking-wide text-white">
              {camera.name}
            </p>
            <p className="mt-1 text-xs text-white/50">
              {liveStatus?.state === "connected"
                ? "Streaming now"
                : hasStreamInput
                  ? "Connected to Stream — waiting for signal"
                  : "Connect to Cloudflare Stream"}
            </p>
          </div>

          {!hasStreamInput && canManage && (
            <ConnectCameraButton
              slug={slug}
              cameraId={camera.id}
              className="w-full"
            />
          )}

          {footer}
        </div>
      </div>
    </article>
  );
}

export function CameraCardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </ul>
  );
}
