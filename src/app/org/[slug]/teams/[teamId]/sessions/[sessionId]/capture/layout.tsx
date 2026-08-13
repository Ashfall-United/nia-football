import type { ReactNode } from "react";

/** Escape org chrome — capture-client portals to document.body as well. */
export default function CaptureLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
