import { NextResponse } from "next/server";
import { resolveSharedDownload } from "@/domain/shares/download";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const clipIndex = Number(new URL(request.url).searchParams.get("clip") ?? "0");
  const safeClipIndex = Number.isFinite(clipIndex) && clipIndex >= 0 ? clipIndex : 0;

  const result = await resolveSharedDownload(token, safeClipIndex);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  if (result.status === "expired") {
    return NextResponse.json({ error: "Share link expired." }, { status: 410 });
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  if (result.status === "processing") {
    return NextResponse.json(
      { status: "processing", message: "Preparing download…" },
      { status: 202 },
    );
  }

  return NextResponse.json({
    status: "ready",
    url: result.url,
    filename: result.filename,
  });
}
