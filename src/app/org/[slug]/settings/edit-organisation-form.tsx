"use client";

import { useActionState, useEffect, useState } from "react";
import {
  GraduationCap,
  ImagePlus,
  Medal,
  School,
  Trophy,
  Users,
} from "lucide-react";
import {
  updateOrganisationAction,
  type UpdateOrganisationActionState,
} from "@/domain/organisations/actions";
import type { OrganisationMembership } from "@/domain/organisations/types";
import {
  organisationTypeOptions,
} from "@/lib/validation/organisation";
import {
  AFRICAN_COUNTRIES,
  type Country,
} from "@/lib/data/african-countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";

const initialState: UpdateOrganisationActionState = undefined;

const ORGANISATION_TYPE_ICONS = {
  academy: GraduationCap,
  youth_club: Users,
  semi_professional: Medal,
  professional: Trophy,
  school_university: School,
} as const;

export function EditOrganisationForm({
  slug,
  membership,
}: {
  slug: string;
  membership: OrganisationMembership;
}) {
  const boundAction = updateOrganisationAction.bind(null, slug);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    membership.logoUrl,
  );
  const [logoName, setLogoName] = useState<string | null>(null);
  const defaultCountry = AFRICAN_COUNTRIES.find(
    (country) => country.code === membership.country,
  );

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview !== membership.logoUrl) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview, membership.logoUrl]);

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setLogoName(null);
      setLogoPreview(membership.logoUrl);
      return;
    }
    setLogoName(file.name);
    setLogoPreview(URL.createObjectURL(file));
  }

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Organisation name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={membership.name}
          required
        />
        {state?.fieldErrors?.name && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.name[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="organisationType">Organisation type</Label>
          <Select
            name="organisationType"
            items={organisationTypeOptions}
            defaultValue={membership.organisationType}
          >
            <SelectTrigger id="organisationType" className="w-full">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {organisationTypeOptions.map((option) => {
                const Icon = ORGANISATION_TYPE_ICONS[option.value];
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <Icon className="size-4 text-muted-foreground" />
                    {option.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {state?.fieldErrors?.organisationType && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.organisationType[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Combobox<Country>
            items={AFRICAN_COUNTRIES}
            itemToStringLabel={(country) => country.name}
            itemToStringValue={(country) => country.code}
            isItemEqualToValue={(a, b) => a.code === b.code}
            name="country"
            defaultValue={defaultCountry ?? undefined}
            required
          >
            <ComboboxTrigger id="country" className="w-full">
              <ComboboxValue placeholder="Select a country">
                {(country: Country | null) =>
                  country ? (
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <span aria-hidden="true">{country.flag}</span>
                      {country.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Select a country
                    </span>
                  )
                }
              </ComboboxValue>
            </ComboboxTrigger>
            <ComboboxContent searchPlaceholder="Search country…">
              {AFRICAN_COUNTRIES.map((country) => (
                <ComboboxItem key={country.code} value={country}>
                  <span aria-hidden="true">{country.flag}</span>
                  {country.name}
                </ComboboxItem>
              ))}
            </ComboboxContent>
          </Combobox>
          {state?.fieldErrors?.country && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.country[0]}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">Logo</Label>
        <div className="flex items-start gap-4">
          <label
            htmlFor="logo"
            className="flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-input bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50"
          >
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <ImagePlus className="size-6" />
            )}
          </label>
          <div className="min-w-0 flex-1 space-y-1 pt-1">
            <label
              htmlFor="logo"
              className="block cursor-pointer text-sm font-medium text-foreground"
            >
              {logoName ?? "Upload a new logo"}
            </label>
            <p className="text-xs text-muted-foreground">
              PNG or JPG. Leave empty to keep the current logo.
            </p>
          </div>
        </div>
        <input
          id="logo"
          name="logo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleLogoChange}
        />
        {state?.fieldErrors?.logo && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.logo[0]}
          </p>
        )}
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-600">
          Organisation settings saved.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
