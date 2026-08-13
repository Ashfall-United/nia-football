import Link from "next/link";
import { ListFilter } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ANALYSIS_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { listEventsForOrganisation } from "@/domain/events/queries";
import { getVideoForOrganisation } from "@/domain/videos/queries";
import { getSessionForOrganisation } from "@/domain/sessions/queries";
import { getTeamForOrganisation } from "@/domain/teams/queries";
import {
  eventReviewStatusLabelByValue,
  eventReviewStatusOptions,
  eventTypeLabelByValue,
  eventTypeOptions,
} from "@/lib/validation/event";
import { buildVideoPageHref } from "@/lib/video/routes";
import type { EventReviewStatus, EventType } from "@/types/database";
import { EmptyState } from "@/components/empty-state";
import { ListPanel, PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
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

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function isEventType(value: string | undefined): value is EventType {
  return eventTypeOptions.some((option) => option.value === value);
}

function isReviewStatus(
  value: string | undefined,
): value is EventReviewStatus {
  return eventReviewStatusOptions.some((option) => option.value === value);
}

type VideoContext = {
  teamId: string;
  sessionId: string;
  label: string;
} | {
  label: string;
  teamId?: undefined;
  sessionId?: undefined;
};

function getSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    type?: string | string[];
    reviewStatus?: string | string[];
  }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const rawType = getSearchParam(resolvedSearchParams.type);
  const rawReviewStatus = getSearchParam(resolvedSearchParams.reviewStatus);
  const typeFilter = isEventType(rawType) ? rawType : undefined;
  const reviewStatusFilter = isReviewStatus(rawReviewStatus)
    ? rawReviewStatus
    : undefined;

  const events = await listEventsForOrganisation(membership.id, {
    type: typeFilter,
    reviewStatus: reviewStatusFilter,
  });

  const videoIds = [...new Set(events.map((event) => event.videoId))];
  const videoContexts = new Map<string, VideoContext>();

  await Promise.all(
    videoIds.map(async (videoId) => {
      const video = await getVideoForOrganisation(membership.id, videoId);
      if (!video) {
        videoContexts.set(videoId, { label: "Unknown video" });
        return;
      }

      const session = await getSessionForOrganisation(
        membership.id,
        video.sessionId,
      );
      if (!session) {
        videoContexts.set(videoId, { label: "Unknown session" });
        return;
      }

      const team = await getTeamForOrganisation(
        membership.id,
        session.teamId,
      );
      const teamName = team?.name ?? "Team";

      videoContexts.set(videoId, {
        teamId: session.teamId,
        sessionId: session.id,
        label: `${teamName} · ${session.type === "match" ? "Match" : "Training"}`,
      });
    }),
  );

  const eventsHref = `/org/${slug}/events`;

  return (
    <PageShell>
      <PageHeader
        title="Events"
        icon={ListFilter}
        description="Browse tagged moments across your organisation's footage."
      />

      <form
        method="get"
        className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-end"
      >
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">Event type</Label>
            <Select
              name="type"
              items={[{ value: "", label: "All types" }, ...eventTypeOptions]}
              defaultValue={typeFilter ?? ""}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {eventTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reviewStatus">Review status</Label>
            <Select
              name="reviewStatus"
              items={[
                { value: "", label: "All statuses" },
                ...eventReviewStatusOptions,
              ]}
              defaultValue={reviewStatusFilter ?? ""}
            >
              <SelectTrigger id="reviewStatus" className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {eventReviewStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit">Apply filters</Button>
          {(typeFilter || reviewStatusFilter) && (
            <Link
              href={eventsHref}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {events.length > 0 ? (
        <ListPanel>
          {events.map((event) => {
            const context = videoContexts.get(event.videoId) ?? {
              label: "Unknown video",
            };
            const reviewLabel =
              eventReviewStatusLabelByValue.get(event.reviewStatus) ??
              event.reviewStatus;
            const footageHref =
              context.teamId && context.sessionId
                ? buildVideoPageHref(
                    {
                      slug,
                      teamId: context.teamId,
                      sessionId: context.sessionId,
                      videoId: event.videoId,
                    },
                    { startSeconds: event.timestampSeconds },
                  )
                : null;

            return (
              <li
                key={event.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {eventTypeLabelByValue.get(event.type) ?? event.type}
                    </span>
                    <Badge variant="secondary">{reviewLabel}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatTimestamp(event.timestampSeconds)} · {context.label}
                  </p>
                  {event.notes ? (
                    <p className="text-sm text-muted-foreground">
                      {event.notes}
                    </p>
                  ) : null}
                </div>
                {footageHref ? (
                  <Link
                    href={footageHref}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Open footage
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ListPanel>
      ) : (
        <EmptyState
          icon={ListFilter}
          title="No events match these filters"
          description="Tag moments on session footage or run ball detection to populate this list."
        />
      )}
    </PageShell>
  );
}
