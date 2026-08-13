import "server-only";
import type { User } from "@supabase/supabase-js";
import { gravatarUrl } from "@/lib/member/gravatar";

function readMetadataString(
  metadata: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function resolveAuthUserDisplayName(user: User): string | null {
  const metadata = user.user_metadata ?? {};
  return readMetadataString(metadata, [
    "full_name",
    "name",
    "display_name",
  ]);
}

export function resolveAuthUserAvatarUrl(user: User): string | null {
  const metadata = user.user_metadata ?? {};
  return readMetadataString(metadata, [
    "avatar_url",
    "picture",
    "avatar",
  ]);
}

export function resolveMemberAvatarUrl(
  email: string,
  user: User | null | undefined,
): string | null {
  if (user) {
    const authAvatar = resolveAuthUserAvatarUrl(user);
    if (authAvatar) {
      return authAvatar;
    }
  }

  if (email && email !== "Unknown") {
    return gravatarUrl(email);
  }

  return null;
}

export function resolveMemberDisplayName(
  email: string,
  user: User | null | undefined,
): string | null {
  if (user) {
    const name = resolveAuthUserDisplayName(user);
    if (name) {
      return name;
    }
  }

  return null;
}
