"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { getOrgNavSection } from "./org-sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function OrgMobileNav({
  slug,
  showStaffNav = false,
  showAnalysisNav = false,
  showSettingsNav = false,
  showLiveNav = false,
}: {
  slug: string;
  showStaffNav?: boolean;
  showAnalysisNav?: boolean;
  showSettingsNav?: boolean;
  showLiveNav?: boolean;
}) {
  const pathname = usePathname();
  const section = getOrgNavSection(pathname, slug, {
    showStaffNav,
    showAnalysisNav,
    showSettingsNav,
    showLiveNav,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon">
            <Menu className="size-5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {section.backHref && (
          <>
            <DropdownMenuItem render={<Link href={section.backHref} />}>
              ← {section.backLabel}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {section.items.map((item) => (
          <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
            <item.icon className="size-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
