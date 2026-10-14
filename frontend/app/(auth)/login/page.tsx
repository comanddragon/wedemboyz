import { AuthShell } from "@/src/components/auth/AuthShell";
import { LoginForm } from "@/src/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow={["Welcome back"]}
      title="Log in"
      subtitle="Pick up where you left off — check an order or book your next pickup."
    >
      <LoginForm />
    </AuthShell>
  );
}
