import { AuthShell } from "@/src/components/auth/AuthShell";
import { ForgotPasswordCard } from "@/src/components/auth/ForgotPasswordCard";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow={["auth.accountHelp"]}
      title="auth.resetTitle"
      subtitle="auth.resetSubtitle"
    >
      <ForgotPasswordCard />
    </AuthShell>
  );
}
