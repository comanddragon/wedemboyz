import { AuthShell } from "@/src/components/auth/AuthShell";
import { RegisterForm } from "@/src/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow={["Propreté", "Rapidité", "Qualité"]}
      title="Create your account"
      subtitle="Book a pickup in a couple minutes. No storefront visit, no hassle."
    >
      <RegisterForm />
    </AuthShell>
  );
}
