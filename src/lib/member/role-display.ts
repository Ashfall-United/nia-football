import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardList,
  Crown,
  Eye,
  Shield,
  UserCog,
  Video,
} from "lucide-react";
import type { OrganisationRole } from "@/types/database";
import { roleDescription, roleLabel } from "@/lib/validation/member";

export type RoleMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
  badgeClassName: string;
  iconClassName: string;
};

const ownerMeta: RoleMeta = {
  label: "Owner",
  description: "Full organisation control.",
  icon: Crown,
  badgeClassName: "bg-[#f5c400]/15 text-[#8a6d00] ring-[#f5c400]/30",
  iconClassName: "text-[#f5c400]",
};

export const roleMetaByValue: Record<OrganisationRole, RoleMeta> = {
  owner: ownerMeta,
  admin: {
    label: roleLabel("admin"),
    description: roleDescription("admin") ?? "",
    icon: Shield,
    badgeClassName: "bg-primary/10 text-primary ring-primary/20",
    iconClassName: "text-primary",
  },
  coach: {
    label: roleLabel("coach"),
    description: roleDescription("coach") ?? "",
    icon: ClipboardList,
    badgeClassName: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
    iconClassName: "text-emerald-600",
  },
  analyst: {
    label: roleLabel("analyst"),
    description: roleDescription("analyst") ?? "",
    icon: BarChart3,
    badgeClassName: "bg-violet-500/10 text-violet-700 ring-violet-500/20",
    iconClassName: "text-violet-600",
  },
  media: {
    label: roleLabel("media"),
    description: roleDescription("media") ?? "",
    icon: Video,
    badgeClassName: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
    iconClassName: "text-sky-600",
  },
  viewer: {
    label: roleLabel("viewer"),
    description: roleDescription("viewer") ?? "",
    icon: Eye,
    badgeClassName: "bg-muted text-muted-foreground ring-border",
    iconClassName: "text-muted-foreground",
  },
};

export function getRoleMeta(role: OrganisationRole): RoleMeta {
  return roleMetaByValue[role];
}

export function emailInitials(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export { UserCog };
