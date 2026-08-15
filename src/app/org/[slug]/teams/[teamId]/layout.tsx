import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { getTeamForOrganisation } from "@/domain/teams/queries";

export default async function TeamLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const { slug, teamId } = await params;
  const membership = await requireOrganisationBySlug(slug);

  const team = await getTeamForOrganisation(membership.id, teamId);
  if (!team) {
    notFound();
  }

  return children;
}
