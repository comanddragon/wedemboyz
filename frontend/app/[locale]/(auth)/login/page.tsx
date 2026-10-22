import { AuthShell } from "@/src/components/auth/AuthShell";
import { LoginForm } from "@/src/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow={["auth.welcome"]}
      title="auth.loginTitle"
      subtitle="auth.loginSubtitle"
    >
      <LoginForm />
    </AuthShell>
  );
}
