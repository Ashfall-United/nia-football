"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp, type AuthActionState } from "@/lib/auth/actions";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = undefined;

function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const prefilledEmail = searchParams.get("email") ?? "";

  return (
    <AuthCard
      title="Create an account"
      description="Set up your Nia Football account."
    >
      <form action={action} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={prefilledEmail}
            required
          />
          {state?.fieldErrors?.email && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.email[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          {state?.fieldErrors?.password && (
            <ul className="space-y-0.5 text-sm text-destructive">
              {state.fieldErrors.password.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
