export function StreamPlayer({ iframeSrc }: { iframeSrc: string | null }) {
  if (!iframeSrc) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted px-6 text-center text-sm text-muted-foreground">
        <p>Video playback isn&apos;t connected yet.</p>
        <p className="text-xs">
          Add{" "}
          <code className="rounded bg-background px-1 py-0.5">
            NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE
          </code>{" "}
          to your <code className="rounded bg-background px-1 py-0.5">.env</code>{" "}
          file, or ensure{" "}
          <code className="rounded bg-background px-1 py-0.5">
            CLOUDFLARE_STREAM_API_TOKEN
          </code>{" "}
          can read Stream videos. Restart the dev server after changing env vars.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-black pt-[56.25%]">
      <iframe
        src={iframeSrc}
        loading="lazy"
        className="absolute inset-0 size-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        title="Video playback"
      />
    </div>
  );
}
