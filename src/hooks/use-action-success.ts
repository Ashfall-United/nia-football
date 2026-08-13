"use client";

import { useEffect, useRef } from "react";

// Server Actions bound to useActionState don't have a distinct "just
// succeeded" state — a successful submission returns the same `undefined`
// shape as the initial state. This watches the pending->settled transition
// and fires onSuccess only when that settle happened without an error.
export function useActionSuccess(
  pending: boolean,
  hasError: boolean,
  onSuccess?: () => void,
) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !hasError) {
      onSuccess?.();
    }
    wasPending.current = pending;
  }, [pending, hasError, onSuccess]);
}
