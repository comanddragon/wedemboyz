import { AuthShell } from "@/src/components/auth/AuthShell";
import { ForgotPasswordCard } from "@/src/components/auth/ForgotPasswordCard";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow={["auth.realPeople"]}
      title="auth.forgotTitle"
      subtitle="auth.forgotSubtitle"
    >
      <ForgotPasswordCard />
    </AuthShell>
  );
}
