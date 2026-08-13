import { Film, LayoutDashboard, Shield, Video } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { getOrganisationOverviewStats } from "@/domain/organisations/queries";
import { PageHeader, PageShell, StatCard } from "@/components/page-shell";

const statCards = [
  {
    key: "teams" as const,
    label: "Teams",
    href: (slug: string) => `/org/${slug}/teams`,
    icon: Shield,
  },
  {
    key: "clips" as const,
    label: "Clips",
    href: (slug: string) => `/org/${slug}/clips`,
    icon: Film,
  },
  {
    key: "cameras" as const,
    label: "Cameras",
    href: (slug: string) => `/org/${slug}/cameras`,
    icon: Video,
  },
];

export default async function OrganisationOverviewPage(
  props: PageProps<"/org/[slug]">,
) {
  const { slug } = await props.params;
  const membership = await requireOrganisationBySlug(slug);
  const stats = await getOrganisationOverviewStats(membership.id);

  return (
    <PageShell>
      <PageHeader title="Overview" icon={LayoutDashboard} />

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            href={card.href(slug)}
            icon={card.icon}
            label={card.label}
            value={stats[card.key]}
          />
        ))}
      </div>
    </PageShell>
  );
}
