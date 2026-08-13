import "server-only";
import { createClient } from "@/services/supabase/server";
import {
  sharedLinkExpiredSchema,
  sharedLinkPreviewSchema,
} from "@/lib/validation/share";
import type { SharedLinkResult } from "./types";

export function buildShareUrl(token: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl.replace(/\/$/, "")}/share/${token}`;
}

export async function getSharedLinkPreview(
  token: string,
): Promise<SharedLinkResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_shared_link_preview", {
    link_token: token,
  });

  if (error) {
    console.error("[shares] Failed to load share preview:", error);
    throw new Error("Failed to load share link.");
  }

  if (!data) {
    return null;
  }

  const expired = sharedLinkExpiredSchema.safeParse(data);
  if (expired.success) {
    return expired.data;
  }

  const parsed = sharedLinkPreviewSchema.safeParse(data);
  if (!parsed.success) {
    console.error("[shares] Invalid share preview payload:", parsed.error);
    return null;
  }

  return parsed.data;
}
