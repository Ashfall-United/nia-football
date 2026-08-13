import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { AuthCard } from "@/components/auth-card";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  await requireAuthenticatedUser();

  return (
    <AuthCard
      title="Create your organisation"
      description="Tell us about your club or academy to get started. You'll add teams from your dashboard next."
    >
      <OnboardingForm />
    </AuthCard>
  );
}
