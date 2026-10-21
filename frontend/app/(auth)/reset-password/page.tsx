import { AuthShell } from "@/src/components/auth/AuthShell";
import { ForgotPasswordCard } from "@/src/components/auth/ForgotPasswordCard";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow={["ACCOUNT HELP"]}
      title="Reset your password"
      subtitle="Online password resets aren't available yet. Contact the team and we'll help you regain access securely."
    >
      <ForgotPasswordCard />
    </AuthShell>
  );
}
