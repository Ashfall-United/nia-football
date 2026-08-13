"use client";

import { useActionState, useState } from "react";
import { Mail } from "lucide-react";
import {
  inviteMemberAction,
  type MemberActionState,
} from "@/domain/members/actions";
import { useActionSuccess } from "@/hooks/use-action-success";
import { useFormDialogClose } from "@/components/form-dialog";
import { getRoleMeta } from "@/lib/member/role-display";
import { invitableRoleOptions } from "@/lib/validation/member";
import type { InvitableRole } from "@/lib/validation/member";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const initialState: MemberActionState = undefined;

export function InviteMemberForm({ slug }: { slug: string }) {
  const boundAction = inviteMemberAction.bind(null, slug);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const close = useFormDialogClose();
  const [selectedRole, setSelectedRole] = useState<InvitableRole>("coach");
  const selectedMeta = getRoleMeta(selectedRole);
  const SelectedRoleIcon = selectedMeta.icon;

  useActionSuccess(
    pending,
    Boolean(state?.error || state?.fieldErrors || state?.success?.inviteUrl),
    close,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="coach@club.com"
            className="pl-9"
            required
          />
        </div>
        {state?.fieldErrors?.email ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-role">Role</Label>
        <input type="hidden" name="role" value={selectedRole} />
        <Select
          value={selectedRole}
          onValueChange={(value) => {
            if (
              value &&
              invitableRoleOptions.some((option) => option.value === value)
            ) {
              setSelectedRole(value as InvitableRole);
            }
          }}
        >
          <SelectTrigger id="invite-role" className="w-full">
            <SelectValue placeholder="Select a role">
              <span className="inline-flex items-center gap-2">
                <SelectedRoleIcon
                  className={cn("size-3.5", selectedMeta.iconClassName)}
                />
                {selectedMeta.label}
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
        <p className="text-xs text-muted-foreground">{selectedMeta.description}</p>
        {state?.fieldErrors?.role ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.role[0]}
          </p>
        ) : null}
      </div>

      {state?.success?.inviteUrl ? (
        <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
          <p className="text-sm text-foreground">{state.success.message}</p>
          <Label htmlFor="invite-link">Invite link</Label>
          <Input
            id="invite-link"
            readOnly
            value={state.success.inviteUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
          <p className="text-xs text-muted-foreground">
            Copy this link if they don&apos;t receive the email.
          </p>
        </div>
      ) : null}

      {state?.success && !state.success.inviteUrl ? (
        <p className="text-sm text-muted-foreground">{state.success.message}</p>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </Button>
    </form>
  );
}
