import { AuthShell } from "@/src/components/auth/AuthShell";
import { RegisterForm } from "@/src/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow={["Propreté", "Rapidité", "Qualité"]}
      title="auth.registerTitle"
      subtitle="auth.registerSubtitle"
    >
      <RegisterForm />
    </AuthShell>
  );
}
