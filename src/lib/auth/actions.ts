"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/services/supabase/server";
import {
  requestPasswordResetSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";

export type AuthActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

// Supabase's built-in email sender allows only a handful of emails per hour
// per project when no custom SMTP provider is configured. Surfacing this
// distinctly avoids telling the user to retry something that will keep
// failing until the window resets.
function isEmailRateLimited(error: AuthError): boolean {
  return error.code === "over_email_send_rate_limit";
}

const RATE_LIMIT_MESSAGE =
  "Too many emails have been sent. Wait a few minutes and try again.";

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validated = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validated.data);

  if (error) {
    console.error("signIn failed", error);
    return {
      error:
        "We couldn't sign you in. Check your email and password and try again.",
    };
  }

  const next = formData.get("next");
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    redirect(next);
  }

  redirect("/dashboard");
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validated = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const next = formData.get("next");
  const emailRedirectTo =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`
      : `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`;

  const { error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    console.error("signUp failed", error);
    return {
      error: isEmailRateLimited(error)
        ? RATE_LIMIT_MESSAGE
        : "We couldn't create your account. Try again.",
    };
  }

  redirect("/check-email");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validated = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    validated.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password`,
    },
  );

  if (error) {
    console.error("requestPasswordReset failed", error);

    // Rate limiting is a system-level state, not account-specific, so
    // surfacing it doesn't create an account-enumeration risk the way
    // other errors here would.
    if (isEmailRateLimited(error)) {
      return { error: RATE_LIMIT_MESSAGE };
    }
  }

  // Otherwise always redirect to the same confirmation screen regardless of
  // whether the email is registered, so this can't be used to enumerate
  // accounts.
  redirect("/check-email?context=reset-password");
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validated = updatePasswordSchema.safeParse({
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: validated.data.password,
  });

  if (error) {
    console.error("updatePassword failed", error);
    return {
      error:
        "We couldn't update your password. Request a new reset link and try again.",
    };
  }

  redirect("/dashboard");
}
