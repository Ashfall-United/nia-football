import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Revalidates the session with Supabase Auth on every request so cookies
  // stay fresh. Do not add logic between createServerClient and getUser().
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // A stale/rotated refresh token cookie (e.g. left over from testing, or
  // a session revoked server-side) fails on every request forever unless
  // we explicitly clear it here — getUser() alone doesn't do that.
  if (error?.code === "refresh_token_not_found") {
    await supabase.auth.signOut();
    return { supabaseResponse, user: null };
  }

  return { supabaseResponse, user };
}
