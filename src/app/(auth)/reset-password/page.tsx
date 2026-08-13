import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { AuthCard } from "@/components/auth-card";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  await requireAuthenticatedUser();

  return (
    <AuthCard
      title="Set a new password"
      description="Choose a new password for your Nia Football account."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
