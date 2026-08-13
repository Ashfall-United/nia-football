import Link from "next/link";
import { ListMusic, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader, PageShell } from "@/components/page-shell";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { PLAYLIST_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { listPlaylistsForOrganisation } from "@/domain/playlists/queries";
import { CreatePlaylistForm } from "./create-playlist-form";
import { formatDisplayDate } from "@/lib/format/date";

export default async function PlaylistsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const membership = await requireOrganisationBySlug(slug);
  const canManage = PLAYLIST_MANAGEMENT_ROLES.includes(membership.role);
  const result = await listPlaylistsForOrganisation(membership.id);
  const schemaNotMigrated = !result.ok;
  const playlists = result.ok ? result.playlists : [];

  return (
    <PageShell className="space-y-8">
      <PageHeader
        title="Playlists"
        icon={ListMusic}
        description="Curate clips into shareable collections for staff and players."
        action={
          canManage ? (
            <FormDialog
              triggerLabel="New playlist"
              triggerIcon={<Plus className="size-4" />}
              title="Create playlist"
              description="Group highlights into a playlist you can share outside the org."
            >
              <CreatePlaylistForm slug={slug} />
            </FormDialog>
          ) : undefined
        }
      />

      {schemaNotMigrated ? (
        <EmptyState
          icon={ListMusic}
          title="Playlists need a database update"
          description="Apply pending Supabase migrations to enable playlists and share links: run supabase db push from the project root, then reload this page."
        />
      ) : playlists.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <Link
                href={`/org/${slug}/playlists/${playlist.id}`}
                className="group block h-full rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <ListMusic className="size-5 text-primary" />
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                    {playlist.clipCount}{" "}
                    {playlist.clipCount === 1 ? "clip" : "clips"}
                  </span>
                </div>
                <h2 className="mt-4 font-heading text-lg font-semibold uppercase tracking-wide group-hover:text-primary">
                  {playlist.title}
                </h2>
                {playlist.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {playlist.description}
                  </p>
                ) : null}
                <p className="mt-4 text-xs text-muted-foreground">
                  Updated {formatDisplayDate(playlist.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={ListMusic}
          title="No playlists yet"
          description={
            canManage
              ? "Create a playlist to group clips for review sessions or to share with players and parents."
              : "Playlists created by coaches will appear here."
          }
        />
      )}
    </PageShell>
  );
}
