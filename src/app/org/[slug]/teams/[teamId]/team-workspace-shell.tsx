"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function TeamWorkspaceShell({
  slug,
  teamId,
  roster,
  children,
}: {
  slug: string;
  teamId: string;
  roster: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isCapture = pathname.includes("/capture");
  const isRosterPage = pathname === `/org/${slug}/teams/${teamId}`;
  const showRoster = !isCapture && !isRosterPage;

  return (
    <div className="flex min-h-0 flex-1">
      {showRoster && (
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-background lg:flex">
          {roster}
        </aside>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
