import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

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
