"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Copy, Mail, Trash2 } from "lucide-react";
import {
  removeMemberAction,
  revokeInviteAction,
  updateMemberRoleAction,
} from "@/domain/members/actions";
import type { OrganisationMember } from "@/domain/members/types";
import type { OrganisationRole } from "@/types/database";
import { getRoleMeta } from "@/lib/member/role-display";
import { invitableRoleOptions } from "@/lib/validation/member";
import { StaffAvatar } from "./staff-avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function RoleBadge({ role }: { role: OrganisationRole }) {
  const meta = getRoleMeta(role);
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        meta.badgeClassName,
      )}
    >
      <Icon className={cn("size-3.5", meta.iconClassName)} />
      {meta.label}
    </span>
  );
}

export function MemberRow({
  slug,
  member,
  currentUserId,
  canManage,
}: {
  slug: string;
  member: OrganisationMember;
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isRemoving, startRemove] = useTransition();
  const [isUpdating, startUpdate] = useTransition();
  const [role, setRole] = useState(member.role);
  const isSelf = member.userId === currentUserId;
  const isOwner = member.role === "owner";
  const selectedRoleMeta = getRoleMeta(role);
  const SelectedRoleIcon = selectedRoleMeta.icon;

  function handleRemove() {
    startRemove(async () => {
      const result = await removeMemberAction(slug, member.id);
      if (result?.error) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRoleSave() {
    const formData = new FormData();
    formData.set("memberId", member.id);
    formData.set("role", role);

    startUpdate(async () => {
      const result = await updateMemberRoleAction(slug, undefined, formData);
      if (result?.error) {
        window.alert(result.error);
        return;
      }
      if (result?.fieldErrors?.role) {
        window.alert(result.fieldErrors.role[0]);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <StaffAvatar
          email={member.email}
          displayName={member.displayName}
          avatarUrl={member.avatarUrl}
        />
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium">
            {member.displayName ?? member.email}
          </p>
          {member.displayName ? (
            <p className="truncate text-xs text-muted-foreground">
              {member.email}
            </p>
          ) : null}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3 shrink-0" />
              Joined{" "}
              {new Date(member.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {isSelf ? <span>· You</span> : null}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {canManage && !isOwner ? (
          <div className="flex items-center gap-2">
            <Select
              value={role}
              onValueChange={(value) => {
                if (value) {
                  setRole(value as OrganisationRole);
                }
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select role">
                  <span className="inline-flex items-center gap-2">
                    <SelectedRoleIcon
                      className={cn("size-3.5", selectedRoleMeta.iconClassName)}
                    />
                    {selectedRoleMeta.label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {invitableRoleOptions.map((option) => {
                  const meta = getRoleMeta(option.value);
                  const Icon = meta.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="inline-flex items-center gap-2">
                        <Icon className={cn("size-3.5", meta.iconClassName)} />
                        {option.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={handleRoleSave}
            >
              Save
            </Button>
          </div>
        ) : (
          <RoleBadge role={member.role} />
        )}

        {canManage && !isOwner && !isSelf ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isRemoving}
            onClick={handleRemove}
            aria-label={`Remove ${member.email}`}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function PendingInviteRow({
  slug,
  email,
  avatarUrl,
  role,
  inviteUrl,
  inviteId,
}: {
  slug: string;
  email: string;
  avatarUrl: string | null;
  role: OrganisationRole;
  inviteUrl: string;
  inviteId: string;
}) {
  const router = useRouter();
  const [isRevoking, startRevoke] = useTransition();
  const meta = getRoleMeta(role);
  const RoleIcon = meta.icon;

  function handleCopy() {
    void navigator.clipboard.writeText(inviteUrl);
  }

  function handleRevoke() {
    startRevoke(async () => {
      const result = await revokeInviteAction(slug, inviteId);
      if (result?.error) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <StaffAvatar email={email} avatarUrl={avatarUrl} />
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium">{email}</p>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <RoleIcon className={cn("size-3.5", meta.iconClassName)} />
            Pending invite · {meta.label}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-500/20">
          <Mail className="size-3.5" />
          Pending
        </span>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="size-3.5" />
          Copy link
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={isRevoking}
          onClick={handleRevoke}
          aria-label={`Revoke invite for ${email}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </li>
  );
}
