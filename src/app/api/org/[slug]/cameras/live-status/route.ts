import { NextResponse } from "next/server";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { listCameraLiveStatuses } from "@/domain/cameras/queries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const membership = await requireOrganisationBySlug(slug);
    const statuses = await listCameraLiveStatuses(membership.id);
    return NextResponse.json({ statuses });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
