"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { createClient } from "@/services/supabase/server";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { MEMBER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import {
  createOrganisationSchema,
  updateOrganisationSchema,
} from "@/lib/validation/organisation";

export type CreateOrganisationActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

const UNIQUE_VIOLATION = "23505";
const MAX_SLUG_ATTEMPTS = 5;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slug || "org";
}

function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export async function createOrganisationAction(
  _prevState: CreateOrganisationActionState,
  formData: FormData,
): Promise<CreateOrganisationActionState> {
  const user = await requireAuthenticatedUser();

  const validated = createOrganisationSchema.safeParse({
    name: formData.get("name"),
    organisationType: formData.get("organisationType"),
    country: formData.get("country"),
    referralSource: formData.get("referralSource"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const logoFile = formData.get("logo");
  let logoUrl: string | null = null;

  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) {
      return { fieldErrors: { logo: ["Logo must be an image file."] } };
    }
    if (logoFile.size > MAX_LOGO_BYTES) {
      return { fieldErrors: { logo: ["Logo must be smaller than 5MB."] } };
    }

    const extension = logoFile.name.split(".").pop() || "png";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("organisation-logos")
      .upload(path, logoFile, { contentType: logoFile.type });

    if (uploadError) {
      return { error: "We couldn't upload the logo. Try again." };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("organisation-logos").getPublicUrl(path);
    logoUrl = publicUrl;
  }

  const baseSlug = slugify(validated.data.name);
  let slug = baseSlug;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const { error } = await supabase.rpc("create_organisation", {
      org_name: validated.data.name,
      org_slug: slug,
      org_type: validated.data.organisationType,
      org_country: validated.data.country,
      org_logo_url: logoUrl,
      org_referral_source: validated.data.referralSource ?? null,
    });

    if (!error) {
      redirect("/dashboard");
    }

    if (error.code !== UNIQUE_VIOLATION) {
      return { error: "We couldn't create your organisation. Try again." };
    }

    slug = `${baseSlug}-${randomSlugSuffix()}`;
  }

  return { error: "We couldn't create your organisation. Try again." };
}

export type UpdateOrganisationActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
      success?: boolean;
    }
  | undefined;

export async function updateOrganisationAction(
  slug: string,
  _prevState: UpdateOrganisationActionState,
  formData: FormData,
): Promise<UpdateOrganisationActionState> {
  await requireAuthenticatedUser();
  const membership = await requireOrganisationBySlug(
    slug,
    MEMBER_MANAGEMENT_ROLES,
  );

  const validated = updateOrganisationSchema.safeParse({
    name: formData.get("name"),
    organisationType: formData.get("organisationType"),
    country: formData.get("country"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const logoFile = formData.get("logo");
  let logoUrl: string | undefined;

  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) {
      return { fieldErrors: { logo: ["Logo must be an image file."] } };
    }
    if (logoFile.size > MAX_LOGO_BYTES) {
      return { fieldErrors: { logo: ["Logo must be smaller than 5MB."] } };
    }

    const extension = logoFile.name.split(".").pop() || "png";
    const path = `${membership.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("organisation-logos")
      .upload(path, logoFile, { contentType: logoFile.type });

    if (uploadError) {
      return { error: "We couldn't upload the logo. Try again." };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("organisation-logos").getPublicUrl(path);
    logoUrl = publicUrl;
  }

  const { error } = await supabase
    .from("organisations")
    .update({
      name: validated.data.name,
      organisation_type: validated.data.organisationType,
      country: validated.data.country,
      ...(logoUrl !== undefined ? { logo_url: logoUrl } : {}),
    })
    .eq("id", membership.id);

  if (error) {
    console.error("[organisations] Failed to update organisation:", error);
    return { error: "We couldn't update your organisation. Try again." };
  }

  revalidatePath(`/org/${slug}`);
  revalidatePath("/dashboard");
  return { success: true };
}
