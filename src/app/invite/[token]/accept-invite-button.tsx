"use client";

import { useTransition, useState } from "react";
import { acceptInviteAction } from "@/domain/members/actions";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const [isPending, startAccept] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    startAccept(async () => {
      const result = await acceptInviteAction(token);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        className="w-full"
        disabled={isPending}
        onClick={handleAccept}
      >
        {isPending ? "Joining…" : "Accept invite"}
      </Button>
    </div>
  );
}
