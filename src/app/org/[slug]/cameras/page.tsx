import { Plus, Video } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { MEDIA_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import {
  getCameraStreamCredentials,
  listCameraLiveStatuses,
  listCamerasForOrganisation,
} from "@/domain/cameras/queries";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader, PageShell } from "@/components/page-shell";
import { CameraCard, CameraCardGrid } from "./camera-card";
import { CreateCameraForm } from "./create-camera-form";
import { ManageCameraCard } from "./manage-camera-card";

export default async function CamerasPage(
  props: PageProps<"/org/[slug]/cameras">,
) {
  const { slug } = await props.params;
  const membership = await requireOrganisationBySlug(slug);
  const [cameras, liveStatuses] = await Promise.all([
    listCamerasForOrganisation(membership.id),
    listCameraLiveStatuses(membership.id),
  ]);
  const canManageCameras = MEDIA_MANAGEMENT_ROLES.includes(membership.role);

  const liveStatusByCameraId = new Map(
    liveStatuses.map((status) => [status.cameraId, status]),
  );

  const credentialsByCameraId = new Map(
    await Promise.all(
      cameras
        .filter((camera) => camera.streamLiveInputId)
        .map(async (camera) => {
          const credentials = await getCameraStreamCredentials(
            membership.id,
            camera.id,
          );
          return [camera.id, credentials] as const;
        }),
    ),
  );

  return (
    <PageShell>
      <PageHeader
        title="Cameras"
        icon={Video}
        action={
          canManageCameras ? (
            <FormDialog
              triggerLabel="Add camera"
              triggerIcon={<Plus className="size-4" />}
              title="Add a camera"
            >
              <CreateCameraForm slug={slug} />
            </FormDialog>
          ) : undefined
        }
      />

      {cameras.length > 0 ? (
        <CameraCardGrid>
          {cameras.map((camera) => (
            <li key={camera.id}>
              {canManageCameras ? (
                <ManageCameraCard
                  slug={slug}
                  camera={camera}
                  liveStatus={liveStatusByCameraId.get(camera.id)}
                  credentials={credentialsByCameraId.get(camera.id) ?? null}
                />
              ) : (
                <CameraCard
                  camera={camera}
                  slug={slug}
                  canManage={false}
                  liveStatus={liveStatusByCameraId.get(camera.id)}
                />
              )}
            </li>
          ))}
        </CameraCardGrid>
      ) : (
        <EmptyState
          icon={Video}
          title="No cameras yet"
          description={
            canManageCameras
              ? "Use the Add camera button above, then connect it to Cloudflare Stream."
              : "An owner, admin, or media team member hasn't added any cameras yet."
          }
        />
      )}
    </PageShell>
  );
}
