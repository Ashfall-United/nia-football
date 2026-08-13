import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth-card";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>;
}) {
  const { context } = await searchParams;
  const isPasswordReset = context === "reset-password";

  return (
    <AuthCard title="Check your email" centered>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <MailCheck className="size-5 text-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          {isPasswordReset
            ? "If an account exists for that email, we sent a link to reset your password."
            : "We sent you a confirmation link. Follow it to activate your account."}
        </p>
      </div>
    </AuthCard>
  );
}
