import { redirect } from "next/navigation";

export default async function TeamPage(
  props: PageProps<"/org/[slug]/teams/[teamId]">,
) {
  const { slug, teamId } = await props.params;
  redirect(`/org/${slug}/teams/${teamId}/sessions`);
}
