import Link from "next/link";
import {
  CreditCard,
  HardDrive,
  Settings,
  Users,
  Video,
} from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { MEMBER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getOrganisationUsageStats } from "@/domain/organisations/queries";
import { organisationPlanLabels } from "@/lib/validation/organisation";
import { PageHeader, PageShell, SummaryStatCard } from "@/components/page-shell";
import { cn } from "@/lib/utils";
import { EditOrganisationForm } from "./edit-organisation-form";

const tabs = [
  { id: "general", label: "General" },
  { id: "usage", label: "Usage stats" },
  { id: "plan", label: "Plan" },
] as const;

type SettingsTab = (typeof tabs)[number]["id"];

function isSettingsTab(value: string | undefined): value is SettingsTab {
  return tabs.some((tab) => tab.id === value);
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const membership = await requireOrganisationBySlug(
    slug,
    MEMBER_MANAGEMENT_ROLES,
  );

  const tabParam =
    typeof resolvedSearchParams.tab === "string"
      ? resolvedSearchParams.tab
      : undefined;
  const activeTab = isSettingsTab(tabParam) ? tabParam : "general";
  const usageStats =
    activeTab === "usage"
      ? await getOrganisationUsageStats(membership.id)
      : null;

  return (
    <PageShell size="2xl">
      <PageHeader
        title="Settings"
        titleCase="sentence"
        icon={Settings}
        description="Manage your organisation profile, usage, and plan."
      />

      <div className="flex flex-wrap gap-2 border-b pb-1">
        {tabs.map((tab) => {
          const href =
            tab.id === "general"
              ? `/org/${slug}/settings`
              : `/org/${slug}/settings?tab=${tab.id}`;
          return (
            <Link
              key={tab.id}
              href={href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {activeTab === "general" ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <EditOrganisationForm slug={slug} membership={membership} />
        </div>
      ) : null}

      {activeTab === "usage" && usageStats ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryStatCard
              icon={Video}
              label="Videos"
              value={usageStats.videos}
              hint="Ready session recordings"
            />
            <SummaryStatCard
              icon={HardDrive}
              label="Footage duration"
              value={Math.max(1, Math.round(usageStats.totalDurationSeconds / 60))}
              hint={`${formatDuration(usageStats.totalDurationSeconds)} recorded`}
              accentClassName="bg-sky-500/10 [&_svg]:text-sky-600"
            />
            <SummaryStatCard
              icon={Users}
              label="Members"
              value={usageStats.members}
              hint="Active staff accounts"
              accentClassName="bg-emerald-500/10 [&_svg]:text-emerald-600"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryStatCard
              icon={Video}
              label="Clips"
              value={usageStats.clips}
              hint="Saved highlights"
            />
            <SummaryStatCard
              icon={Settings}
              label="Events"
              value={usageStats.events}
              hint="Tagged and suggested moments"
            />
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Storage estimate</p>
            <p className="mt-2 font-heading text-3xl font-semibold tabular-nums">
              {usageStats.storageEstimateGb.toFixed(2)} GB
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Rough estimate based on ready video duration (~2.5 MB per minute).
            </p>
          </div>
        </div>
      ) : null}

      {activeTab === "plan" ? (
        <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="size-5 text-primary" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="mt-1 text-xl font-semibold">
                {organisationPlanLabels[membership.plan]}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Billing and plan upgrades are coming soon. Your workspace is on the{" "}
            {organisationPlanLabels[membership.plan].toLowerCase()} plan while
            we finish payment integration.
          </p>
        </div>
      ) : null}
    </PageShell>
  );
}
