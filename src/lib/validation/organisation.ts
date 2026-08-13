import { z } from "zod";
import { AFRICAN_COUNTRY_CODE_SET } from "@/lib/data/african-countries";

export const organisationTypeOptions = [
  { value: "academy", label: "Academy" },
  { value: "youth_club", label: "Youth club" },
  { value: "semi_professional", label: "Semi-professional" },
  { value: "professional", label: "Professional" },
  { value: "school_university", label: "School / university" },
] as const;

const organisationTypeValues = organisationTypeOptions.map((o) => o.value);

export const referralSourceOptions = [
  { value: "search_engine", label: "Search engine" },
  { value: "social_media", label: "Social media" },
  { value: "word_of_mouth", label: "Word of mouth / referral" },
  { value: "event", label: "Conference or event" },
  { value: "partner", label: "Partner club or academy" },
  { value: "other", label: "Other" },
] as const;

const referralSourceValues = referralSourceOptions.map((o) => o.value);

export const createOrganisationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters." })
    .max(80, { error: "Name must be 80 characters or fewer." }),
  organisationType: z.enum(organisationTypeValues, {
    error: "Select an organisation type.",
  }),
  country: z
    .string()
    .refine((value) => AFRICAN_COUNTRY_CODE_SET.has(value), {
      error: "Select a country from the list.",
    }),
  referralSource: z
    .enum(referralSourceValues)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;

export const updateOrganisationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters." })
    .max(80, { error: "Name must be 80 characters or fewer." }),
  organisationType: z.enum(organisationTypeValues, {
    error: "Select an organisation type.",
  }),
  country: z
    .string()
    .refine((value) => AFRICAN_COUNTRY_CODE_SET.has(value), {
      error: "Select a country from the list.",
    }),
});

export type UpdateOrganisationInput = z.infer<typeof updateOrganisationSchema>;

export const organisationPlanLabels: Record<
  "early_access" | "standard" | "pro",
  string
> = {
  early_access: "Early access",
  standard: "Standard",
  pro: "Pro",
};
