"use client";

import { useActionState } from "react";
import { updatePassword, type AuthActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = undefined;

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
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
        {pending ? "Updating password…" : "Update password"}
      </Button>
    </form>
  );
}
