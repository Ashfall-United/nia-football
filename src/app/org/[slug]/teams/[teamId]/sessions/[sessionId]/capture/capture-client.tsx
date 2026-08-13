"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import * as tus from "tus-js-client";
import {
  ArrowLeft,
  Camera,
  Check,
  RotateCcw,
  Smartphone,
  SwitchCamera,
  Upload,
} from "lucide-react";
import {
  createVideoUploadAction,
  markVideoReadyAction,
  markVideoErrorAction,
} from "@/domain/videos/actions";
import {
  buildMediaRecorderOptions,
  CAPTURE_VIDEO_CONSTRAINTS,
  getAdaptiveTusChunkSize,
} from "@/lib/video/capture-config";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type OrgCamera = { id: string; name: string };
type FacingMode = "environment" | "user";

type CaptureState =
  | { phase: "permission" }
  | { phase: "ready" }
  | { phase: "recording" }
  | { phase: "uploading"; progress: number; offline: boolean }
  | { phase: "complete" }
  | { phase: "error"; message: string };

const CANDIDATE_MIME_TYPES = [
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return (
    CANDIDATE_MIME_TYPES.find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) ?? null
  );
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function ViewfinderCorners() {
  const corner =
    "absolute size-8 border-white/35 sm:size-10";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-6 sm:inset-10">
      <span className={cn(corner, "top-0 left-0 border-t-2 border-l-2 rounded-tl-lg")} />
      <span className={cn(corner, "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg")} />
      <span className={cn(corner, "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg")} />
      <span className={cn(corner, "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg")} />
    </div>
  );
}

function ControlSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>
      {children}
    </div>
  );
}

function LensSwitcher({
  facingMode,
  disabled,
  onSelect,
  onFlip,
}: {
  facingMode: FacingMode;
  disabled: boolean;
  onSelect: (mode: FacingMode) => void;
  onFlip: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex rounded-2xl bg-white/8 p-1 ring-1 ring-white/12 backdrop-blur-md">
        {(
          [
            { mode: "environment" as const, label: "Back", icon: Camera },
            { mode: "user" as const, label: "Front", icon: Smartphone },
          ] as const
        ).map(({ mode, label, icon: Icon }) => {
          const active = facingMode === mode;
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(mode)}
              className={cn(
                "flex min-w-[5.5rem] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all touch-manipulation",
                active
                  ? "bg-white text-[#01255f] shadow-sm"
                  : "text-white/75 hover:bg-white/10 hover:text-white",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onFlip}
        aria-label="Flip camera"
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full bg-white/8 text-white ring-1 ring-white/12 backdrop-blur-md transition-colors hover:bg-white/15",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <SwitchCamera className="size-5" />
      </button>
    </div>
  );
}

function OrgCameraPicker({
  cameras,
  selectedId,
  disabled,
  onSelect,
}: {
  cameras: OrgCamera[];
  selectedId: string;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Select
      value={selectedId || undefined}
      onValueChange={(value) => onSelect(value as string)}
      items={cameras.map((camera) => ({
        value: camera.id,
        label: camera.name,
      }))}
    >
      <SelectTrigger
        disabled={disabled}
        className="h-11 w-full border-white/20 bg-white/10 text-white backdrop-blur-md data-placeholder:text-white/50"
      >
        <SelectValue placeholder="Select a camera" />
      </SelectTrigger>
      <SelectContent className="z-[10000]">
        {cameras.map((camera) => (
          <SelectItem key={camera.id} value={camera.id}>
            {camera.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RecordButton({
  phase,
  onStart,
  onStop,
}: {
  phase: "ready" | "recording";
  onStart: () => void;
  onStop: () => void;
}) {
  if (phase === "ready") {
    return (
      <button
        type="button"
        onClick={onStart}
        aria-label="Start recording"
        className="group relative flex size-[4.75rem] items-center justify-center rounded-full bg-white/10 ring-2 ring-white/25 transition-transform active:scale-95 sm:size-[5.25rem]"
      >
        <span className="absolute inset-0 rounded-full ring-2 ring-[#f5c400]/40 transition-transform duration-500 group-hover:scale-110" />
        <span className="size-[3.25rem] rounded-full bg-red-600 shadow-[0_0_32px_rgba(220,38,38,0.45)] transition-transform group-hover:scale-105 sm:size-[3.75rem]" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onStop}
      aria-label="Stop recording"
      className="relative flex size-[4.75rem] items-center justify-center rounded-full bg-white/10 ring-2 ring-red-500/60 transition-transform active:scale-95 sm:size-[5.25rem]"
    >
      <span className="size-7 rounded-md bg-white shadow-lg sm:size-8" />
    </button>
  );
}

export function CaptureClient({
  slug,
  teamId,
  sessionId,
  sessionHref,
  sessionLabel,
  cameras,
}: {
  slug: string;
  teamId: string;
  sessionId: string;
  sessionHref: string;
  sessionLabel: string;
  cameras: OrgCamera[];
}) {
  const [orgCameraId, setOrgCameraId] = useState(cameras[0]?.id ?? "");
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [cameraKey, setCameraKey] = useState(0);
  const [state, setState] = useState<CaptureState>({ phase: "permission" });
  const [elapsed, setElapsed] = useState(0);
  const [completedVideoId, setCompletedVideoId] = useState<string | null>(
    null,
  );
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string | null>(null);
  const elapsedRef = useRef(0);
  const uploadRef = useRef<tus.Upload | null>(null);
  const videoIdRef = useRef<string | null>(null);

  const canConfigure =
    state.phase === "ready" || state.phase === "permission";
  const controlsDisabled = state.phase === "permission";
  const selectedOrgCamera = cameras.find((c) => c.id === orgCameraId);
  const isRecording = state.phase === "recording";
  const showSetupControls = canConfigure && !isRecording;

  const bindStream = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, []);

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function openCamera() {
      const mimeType = pickSupportedMimeType();
      if (!mimeType) {
        setState({
          phase: "error",
          message:
            "This browser can't record video. Try the latest Chrome or Safari.",
        });
        return;
      }
      mimeTypeRef.current = mimeType;

      stopStream(streamRef.current);
      setState({ phase: "permission" });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...CAPTURE_VIDEO_CONSTRAINTS,
            facingMode: { ideal: facingMode },
          },
          audio: true,
        });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        bindStream(stream);
        setState({ phase: "ready" });
      } catch {
        if (!cancelled) {
          setState({
            phase: "error",
            message:
              "Camera access was denied. Allow camera and microphone access, then try again.",
          });
        }
      }
    }

    void openCamera();

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
    };
  }, [facingMode, bindStream, cameraKey]);

  useEffect(() => {
    if (state.phase !== "recording") return;
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.phase]);

  useEffect(() => {
    function handleOffline() {
      setState((prev) =>
        prev.phase === "uploading" ? { ...prev, offline: true } : prev,
      );
    }
    function handleOnline() {
      setState((prev) =>
        prev.phase === "uploading" ? { ...prev, offline: false } : prev,
      );
    }
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  function flipCamera() {
    if (controlsDisabled || !canConfigure) return;
    setFacingMode((current) =>
      current === "environment" ? "user" : "environment",
    );
  }

  function resetUploadSession() {
    uploadRef.current?.abort(true).catch(() => {});
    uploadRef.current = null;
    videoIdRef.current = null;
  }

  function handleUploadError() {
    const videoId = videoIdRef.current;
    if (videoId) {
      void markVideoErrorAction(slug, videoId);
    }
    resetUploadSession();
    setState({
      phase: "error",
      message: "The upload failed. Check the connection and try again.",
    });
  }

  function startRecording() {
    if (!streamRef.current || !mimeTypeRef.current) return;

    chunksRef.current = [];
    resetUploadSession();

    const recorder = new MediaRecorder(
      streamRef.current,
      buildMediaRecorderOptions(mimeTypeRef.current),
    );
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => void handleRecordingStopped();
    recorder.start(1000);
    recorderRef.current = recorder;
    elapsedRef.current = 0;
    setElapsed(0);
    setCompletedVideoId(null);
    setState({ phase: "recording" });
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function handleRecordingStopped() {
    const mimeType = mimeTypeRef.current ?? "video/webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const recordedSeconds = elapsedRef.current;

    setState({ phase: "uploading", progress: 0, offline: !navigator.onLine });

    const result = await createVideoUploadAction(
      slug,
      sessionId,
      orgCameraId,
      blob.size,
    );

    if ("error" in result) {
      setState({ phase: "error", message: result.error });
      return;
    }

    videoIdRef.current = result.videoId;

    const upload = new tus.Upload(blob, {
      uploadUrl: result.uploadUrl,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: getAdaptiveTusChunkSize(),
      onError: () => handleUploadError(),
      onProgress: (bytesUploaded, bytesTotal) => {
        setState({
          phase: "uploading",
          progress: bytesTotal > 0 ? bytesUploaded / bytesTotal : 0,
          offline: !navigator.onLine,
        });
      },
      onSuccess: () => {
        void markVideoReadyAction(
          slug,
          result.videoId,
          recordedSeconds,
          sessionId,
        ).then(() => {
          setCompletedVideoId(result.videoId);
          resetUploadSession();
          setState({ phase: "complete" });
        });
      },
    });

    uploadRef.current = upload;
    upload.start();
  }

  function retry() {
    resetUploadSession();
    setCompletedVideoId(null);
    setCameraKey((key) => key + 1);
  }

  const ui = (
    <div className="fixed inset-0 z-[9999] flex h-svh w-screen flex-col overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 size-full object-cover"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.35)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/90"
      />

      <ViewfinderCorners />

      {/* Header */}
      <header className="relative z-10 flex items-start justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href={sessionHref}
          className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-black/65"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-heading text-sm font-semibold uppercase tracking-wide text-white">
            {sessionLabel}
          </p>
          {selectedOrgCamera && (
            <p className="truncate text-xs text-white/55">
              Saving to {selectedOrgCamera.name}
            </p>
          )}
        </div>

        <div className="w-[4.5rem] shrink-0 text-right">
          {isRecording && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide shadow-lg shadow-red-900/40">
              <span className="size-1.5 animate-pulse rounded-full bg-white" />
              Rec
            </span>
          )}
        </div>
      </header>

      <div className="relative z-10 flex-1" />

      {/* Control dock */}
      <footer className="relative z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-lg space-y-5 rounded-[1.75rem] bg-black/55 p-4 ring-1 ring-white/10 backdrop-blur-xl sm:p-5">
          {showSetupControls && (
            <div className="space-y-4">
              <ControlSection label="Phone lens">
                <LensSwitcher
                  facingMode={facingMode}
                  disabled={controlsDisabled}
                  onSelect={setFacingMode}
                  onFlip={flipCamera}
                />
              </ControlSection>

              <ControlSection label="Nia camera">
                <OrgCameraPicker
                  cameras={cameras}
                  selectedId={orgCameraId}
                  disabled={controlsDisabled}
                  onSelect={setOrgCameraId}
                />
                <p className="text-center text-xs text-white/45">
                  Where this recording is saved in your org — works with any
                  number of cameras.
                </p>
              </ControlSection>
            </div>
          )}

          {state.phase === "permission" && (
            <p className="text-center text-sm text-white/70">
              Allow camera access when prompted…
            </p>
          )}

          {(state.phase === "ready" || isRecording) && (
            <div className="flex flex-col items-center gap-3 pt-1">
              {isRecording && (
                <p className="font-mono text-4xl font-light tabular-nums tracking-wider text-white">
                  {formatElapsed(elapsed)}
                </p>
              )}
              <RecordButton
                phase={isRecording ? "recording" : "ready"}
                onStart={startRecording}
                onStop={stopRecording}
              />
              {state.phase === "ready" && (
                <p className="text-center text-xs text-white/50">
                  Tap the red button to record this session
                </p>
              )}
            </div>
          )}

          {state.phase === "uploading" && (
            <div className="space-y-3 py-2 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#f5c400]/15 text-[#f5c400]">
                <Upload className="size-5" />
              </div>
              <p className="text-sm font-medium">
                Uploading… {Math.round(state.progress * 100)}%
              </p>
              <div className="mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full bg-[#f5c400] transition-all duration-300"
                  style={{ width: `${state.progress * 100}%` }}
                />
              </div>
              {state.offline && (
                <p className="text-xs text-white/60">
                  Offline — upload will resume when you reconnect.
                </p>
              )}
            </div>
          )}

          {state.phase === "complete" && completedVideoId && (
            <div className="space-y-3 py-2 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                <Check className="size-6" />
              </div>
              <p className="text-sm font-medium">Recording saved</p>
              <p className="text-xs text-white/55">
                Footage is attached to this session.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href={`/org/${slug}/teams/${teamId}/sessions/${sessionId}/videos/${completedVideoId}`}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#f5c400] text-sm font-semibold text-[#01255f] hover:bg-[#f5c400]/90"
                >
                  View recording
                </Link>
                <Link
                  href={sessionHref}
                  className="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
                >
                  Back to session
                </Link>
              </div>
            </div>
          )}

          {state.phase === "error" && (
            <div className="space-y-3 py-2 text-center">
              <p className="text-sm text-red-200">{state.message}</p>
              <Button
                variant="secondary"
                className="h-11 w-full gap-2 rounded-full bg-white/10 text-white hover:bg-white/15"
                onClick={retry}
              >
                <RotateCcw className="size-4" />
                Try again
              </Button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );

  if (!mounted) return null;
  return createPortal(ui, document.body);
}
