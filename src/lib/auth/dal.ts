import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/services/supabase/server";

// Re-verifies the session against Supabase Auth (not just a local cookie
// decode), so this is safe to treat as the source of truth for "is this
// request authenticated".
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

export const requireAuthenticatedUser = cache(async () => {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});
