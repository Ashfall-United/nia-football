import { notFound } from "next/navigation";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ANALYSIS_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getTeamForOrganisation } from "@/domain/teams/queries";
import { listSessionsForTeam } from "@/domain/sessions/queries";
import { getEventCountsByTypeForSessions } from "@/domain/events/queries";
import {
  eventTypeLabelByValue,
  eventTypeOptions,
} from "@/lib/validation/event";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatSessionLabel(session: {
  type: string;
  scheduledAt: string;
  opponentName: string | null;
}): string {
  const date = new Date(session.scheduledAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (session.type === "match" && session.opponentName) {
    return `${date} · vs ${session.opponentName}`;
  }
  return `${date} · ${session.type === "match" ? "Match" : "Training"}`;
}

export default async function CompareSessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; teamId: string }>;
  searchParams: Promise<{
    sessionA?: string | string[];
    sessionB?: string | string[];
  }>;
}) {
  const { slug, teamId } = await params;
  const resolvedSearchParams = await searchParams;
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const team = await getTeamForOrganisation(membership.id, teamId);
  if (!team) {
    notFound();
  }

  const sessions = await listSessionsForTeam(membership.id, teamId);
  const sessionAId =
    typeof resolvedSearchParams.sessionA === "string"
      ? resolvedSearchParams.sessionA
      : "";
  const sessionBId =
    typeof resolvedSearchParams.sessionB === "string"
      ? resolvedSearchParams.sessionB
      : "";

  const sessionA = sessions.find((session) => session.id === sessionAId);
  const sessionB = sessions.find((session) => session.id === sessionBId);

  const compareHref = `/org/${slug}/teams/${teamId}/compare`;
  const countsBySession =
    sessionA && sessionB
      ? await getEventCountsByTypeForSessions(membership.id, [
          sessionA.id,
          sessionB.id,
        ])
      : null;

  const countsA = countsBySession?.get(sessionA?.id ?? "") ?? {};
  const countsB = countsBySession?.get(sessionB?.id ?? "") ?? {};
  const eventTypesWithData = eventTypeOptions.filter(
    (option) => (countsA[option.value] ?? 0) > 0 || (countsB[option.value] ?? 0) > 0,
  );

  return (
    <PageShell size="5xl">
      <PageHeader
        title={`Compare sessions · ${team.name}`}
        titleCase="sentence"
        icon={BarChart3}
        description="Pick two sessions to compare event counts side by side."
      />

      <form
        method="get"
        className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]"
      >
        <div className="space-y-2">
          <Label htmlFor="sessionA">Session A</Label>
          <Select
            name="sessionA"
            items={sessions.map((session) => ({
              value: session.id,
              label: formatSessionLabel(session),
            }))}
            defaultValue={sessionAId}
          >
            <SelectTrigger id="sessionA" className="w-full">
              <SelectValue placeholder="Select a session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {formatSessionLabel(session)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sessionB">Session B</Label>
          <Select
            name="sessionB"
            items={sessions.map((session) => ({
              value: session.id,
              label: formatSessionLabel(session),
            }))}
            defaultValue={sessionBId}
          >
            <SelectTrigger id="sessionB" className="w-full">
              <SelectValue placeholder="Select a session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {formatSessionLabel(session)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full md:w-auto">
            Compare
          </Button>
        </div>
      </form>

      {sessions.length < 2 ? (
        <EmptyState
          icon={BarChart3}
          title="Need at least two sessions"
          description="Schedule another session for this team before comparing event counts."
        />
      ) : sessionA && sessionB && sessionA.id === sessionB.id ? (
        <EmptyState
          icon={BarChart3}
          title="Choose two different sessions"
          description="Select a different session for A and B to compare their event breakdown."
        />
      ) : sessionA && sessionB ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Session A
              </p>
              <p className="mt-1 font-medium">{formatSessionLabel(sessionA)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Session B
              </p>
              <p className="mt-1 font-medium">{formatSessionLabel(sessionB)}</p>
            </div>
          </div>

          {eventTypesWithData.length > 0 ? (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event type</TableHead>
                    <TableHead className="text-right">Session A</TableHead>
                    <TableHead className="text-right">Session B</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventTypesWithData.map((option) => (
                    <TableRow key={option.value}>
                      <TableCell>{option.label}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {countsA[option.value] ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {countsB[option.value] ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No events in these sessions yet"
              description="Tag events on session footage to populate this comparison."
            />
          )}
        </div>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Select sessions to compare"
          description="Choose two sessions above to see event counts by type side by side."
        />
      )}

      <div>
        <Link
          href={`/org/${slug}/teams/${teamId}/sessions`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to sessions
        </Link>
      </div>
    </PageShell>
  );
}
