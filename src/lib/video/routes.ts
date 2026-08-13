type VideoPageParams = {
  slug: string;
  teamId: string;
  sessionId: string;
  videoId: string;
};

export function buildVideoPageHref(
  { slug, teamId, sessionId, videoId }: VideoPageParams,
  options?: { startSeconds?: number },
): string {
  const base = `/org/${slug}/teams/${teamId}/sessions/${sessionId}/videos/${videoId}`;
  if (options?.startSeconds !== undefined && options.startSeconds >= 0) {
    return `${base}?t=${Math.floor(options.startSeconds)}`;
  }
  return base;
}
