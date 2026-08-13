import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Streaming metadata renders a placeholder <div hidden> in <body> until
  // generateMetadata resolves, then swaps it — timing-sensitive, and on
  // slower pages (this app has ML calls that can run 15-20s+) it can
  // produce a client/server hydration mismatch. Treating every request
  // like an HTML-limited bot disables streaming entirely: metadata
  // blocks rendering instead, which is slightly slower to first byte but
  // deterministic. See https://nextjs.org/docs/app/api-reference/functions/generate-metadata#streaming-metadata
  htmlLimitedBots: /.*/,
};

export default nextConfig;
