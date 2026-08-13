"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, Video } from "lucide-react";
import type { CameraLiveStatus } from "@/domain/cameras/types";
import type { SessionWithTeam } from "@/domain/sessions/types";
import { setCameraActiveSessionAction } from "@/domain/cameras/actions";
import { buildLiveInputIframeSrc } from "@/lib/video/stream-urls";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const NO_SESSION_VALUE = "none";

function LiveStateBadge({ status }: { status: CameraLiveStatus }) {
  if (status.state === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
        <span className="size-1.5 animate-pulse rounded-full bg-white" />
        Live
      </span>
    );
  }

  if (!status.streamLiveInputId) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70">
        Not connected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium capitalize text-white/70">
      {status.state}
    </span>
  );
}

function formatSessionOptionLabel(session: SessionWithTeam): string {
  const date = new Date(session.scheduledAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const kind =
    session.type === "match" && session.opponentName
      ? `vs ${session.opponentName}`
      : session.type === "match"
        ? "Match"
        : "Training";
  return `${session.teamName} — ${date} · ${kind}`;
}

function ActiveSessionPicker({
  slug,
  cameraId,
  activeSessionId,
  sessions,
  onChange,
}: {
  slug: string;
  cameraId: string;
  activeSessionId: string | null;
  sessions: SessionWithTeam[];
  onChange: (sessionId: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(value: string | null) {
    const sessionId = !value || value === NO_SESSION_VALUE ? null : value;
    setError(null);
    onChange(sessionId);
    startTransition(async () => {
      const result = await setCameraActiveSessionAction(
        slug,
        cameraId,
        sessionId,
      );
      if (result?.error) {
        setError(result.error);
        onChange(activeSessionId);
      }
    });
  }

  const options = [
    { value: NO_SESSION_VALUE, label: "Not set" },
    ...sessions.map((session) => ({
      value: session.id,
      label: formatSessionOptionLabel(session),
    })),
  ];

  return (
    <div className="space-y-1.5 px-4 py-3">
      <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Live for session
      </Label>
      <Select
        value={activeSessionId ?? NO_SESSION_VALUE}
        onValueChange={handleChange}
        items={options}
        disabled={pending}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue placeholder="Not set" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function LiveMonitorClient({
  slug,
  initialStatuses,
  sessions,
}: {
  slug: string;
  initialStatuses: CameraLiveStatus[];
  sessions: SessionWithTeam[];
}) {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/org/${slug}/cameras/live-status`);
      if (response.ok) {
        const data: { statuses: CameraLiveStatus[] } = await response.json();
        setStatuses(data.statuses);
      }
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refresh();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [slug]);

  function setLocalActiveSession(cameraId: string, sessionId: string | null) {
    setStatuses((current) =>
      current.map((status) =>
        status.cameraId === cameraId
          ? { ...status, activeSessionId: sessionId }
          : status,
      ),
    );
  }

  const liveCount = statuses.filter((s) => s.state === "connected").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {liveCount > 0
            ? `${liveCount} camera${liveCount === 1 ? "" : "s"} streaming now`
            : "No cameras are live right now"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <ul className="grid gap-4 lg:grid-cols-2">
        {statuses.map((status) => {
          const iframeSrc =
            status.streamLiveInputId && status.state === "connected"
              ? buildLiveInputIframeSrc(status.streamLiveInputId)
              : null;

          return (
            <li
              key={status.cameraId}
              className="overflow-hidden rounded-xl border bg-card shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Video className="size-4 shrink-0 text-primary" />
                  <p className="truncate font-medium">{status.cameraName}</p>
                </div>
                <LiveStateBadge status={status} />
              </div>

              {iframeSrc ? (
                <div className="relative w-full bg-black pt-[56.25%]">
                  <iframe
                    src={iframeSrc}
                    title={`${status.cameraName} live`}
                    className="absolute inset-0 size-full border-0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-muted/40 px-6 text-center text-sm text-muted-foreground">
                  <Video className="size-8 opacity-40" />
                  {status.streamLiveInputId
                    ? "Waiting for stream signal from encoder or phone"
                    : "Connect this camera to Stream first"}
                </div>
              )}

              {status.streamLiveInputId && (
                <div className="border-t">
                  <ActiveSessionPicker
                    slug={slug}
                    cameraId={status.cameraId}
                    activeSessionId={status.activeSessionId}
                    sessions={sessions}
                    onChange={(sessionId) =>
                      setLocalActiveSession(status.cameraId, sessionId)
                    }
                  />
                </div>
              )}

              <div className="border-t px-4 py-3">
                <Link
                  href={`/org/${slug}/cameras`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View camera settings →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
