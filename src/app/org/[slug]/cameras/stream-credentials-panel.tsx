"use client";

import { useState } from "react";
import { Copy, Check, Radio } from "lucide-react";
import type { CameraStreamCredentials } from "@/domain/cameras/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CredentialRow({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45">
        {label}
      </p>
      <div className="flex items-start gap-2">
        <p
          className={cn(
            "min-w-0 flex-1 break-all text-xs text-white/90",
            mono && "font-mono",
          )}
        >
          {value}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          className="shrink-0 bg-white/10 text-white hover:bg-white/20"
          onClick={() => void handleCopy()}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </Button>
      </div>
    </div>
  );
}

export function StreamCredentialsPanel({
  credentials,
  className,
}: {
  credentials: CameraStreamCredentials;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-xl bg-black/40 p-4 ring-1 ring-white/10",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#f5c400]">
        <Radio className="size-3.5" />
        Stream credentials
      </div>
      <p className="text-xs leading-relaxed text-white/55">
        Use RTMP or SRT in OBS, Larix, or a hardware encoder. Phone capture can
        use WebRTC where supported.
      </p>
      <CredentialRow label="RTMP URL" value={credentials.rtmpsUrl} />
      <CredentialRow label="Stream key" value={credentials.rtmpsStreamKey} />
      <CredentialRow label="SRT URL" value={credentials.srtUrl} />
      <CredentialRow label="SRT stream ID" value={credentials.srtStreamId} />
      <CredentialRow label="SRT passphrase" value={credentials.srtPassphrase} />
      <CredentialRow label="WebRTC URL" value={credentials.webRtcUrl} />
    </div>
  );
}
