"use client";

import { emailInitials } from "@/lib/member/role-display";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

export function StaffAvatar({
  email,
  displayName,
  avatarUrl,
  size = "lg",
  className,
}: {
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const initials = emailInitials(displayName ?? email);

  return (
    <Avatar size={size} className={className}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={displayName ?? email} />
      ) : null}
      <AvatarFallback className="bg-[#01255f]/10 text-xs font-semibold text-[#01255f]">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
