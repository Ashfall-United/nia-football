import Link from "next/link";
import { Film, ListMusic } from "lucide-react";
import { getSharedLinkPreview } from "@/domain/shares/queries";
import { resolveStreamIframeSrc } from "@/services/cloudflare/playback";
import { formatVideoTimestamp } from "@/lib/video/timestamp";
import { AuthCard } from "@/components/auth-card";
import { ShareDownloadButton } from "@/components/share-download-button";
import { StreamPlayer } from "@/components/stream-player";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getSharedLinkPreview(token);

  if (!preview) {
    return (
      <AuthCard
        title="Share link not found"
        description="This link is invalid or the shared content was removed."
      >
        <Link href="/" className={cn(buttonVariants(), "w-full")}>
          Go to Nia Football
        </Link>
      </AuthCard>
    );
  }

  if ("expired" in preview) {
    return (
      <AuthCard
        title="Share link expired"
        description="Ask the person who shared this link to create a new one."
      >
        <Link href="/" className={cn(buttonVariants(), "w-full")}>
          Go to Nia Football
        </Link>
      </AuthCard>
    );
  }

  if (preview.resourceType === "clip") {
    const iframeSrc = await resolveStreamIframeSrc(preview.streamUid, {
      startTime: preview.startSeconds,
    });

    return (
      <div className="space-y-6">
        <header className="space-y-2 text-center text-white">
          <p className="text-sm text-white/60">{preview.organisationName}</p>
          <h1 className="font-heading text-2xl font-semibold uppercase tracking-wide">
            {preview.title}
          </h1>
          <p className="font-mono text-sm tabular-nums text-white/70">
            {formatVideoTimestamp(preview.startSeconds)}–
            {formatVideoTimestamp(preview.endSeconds)}
          </p>
        </header>

        <StreamPlayer iframeSrc={iframeSrc} />

        <ShareDownloadButton token={token} />

        {preview.notes ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            {preview.notes}
          </div>
        ) : null}
      </div>
    );
  }

  const clipsWithPlayback = await Promise.all(
    preview.clips.map(async (clip) => ({
      ...clip,
      iframeSrc: await resolveStreamIframeSrc(clip.streamUid, {
        startTime: clip.startSeconds,
      }),
    })),
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center text-white">
        <p className="inline-flex items-center justify-center gap-2 text-sm text-white/60">
          <ListMusic className="size-4" />
          {preview.organisationName}
        </p>
        <h1 className="font-heading text-2xl font-semibold uppercase tracking-wide">
          {preview.title}
        </h1>
        {preview.description ? (
          <p className="mx-auto max-w-xl text-sm text-white/70">
            {preview.description}
          </p>
        ) : null}
      </header>

      {clipsWithPlayback.length > 0 ? (
        <ol className="space-y-8">
          {clipsWithPlayback.map((clip, index) => (
            <li
              key={`${clip.position}-${clip.title}`}
              className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f5c400]/20 text-sm font-semibold tabular-nums text-[#f5c400]">
                  {index + 1}
                </span>
                <div>
                  <p className="font-heading text-lg font-semibold uppercase tracking-wide text-white">
                    {clip.title}
                  </p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-white/60">
                    {formatVideoTimestamp(clip.startSeconds)}–
                    {formatVideoTimestamp(clip.endSeconds)}
                  </p>
                </div>
              </div>
              <StreamPlayer iframeSrc={clip.iframeSrc} />
              <ShareDownloadButton
                token={token}
                clipIndex={index}
                label="Download clip"
              />
            </li>
          ))}
        </ol>
      ) : (
        <AuthCard
          title="Empty playlist"
          description="This playlist doesn't have any clips yet."
        >
          <Film className="mx-auto mb-2 size-8 text-muted-foreground" />
        </AuthCard>
      )}
    </div>
  );
}
