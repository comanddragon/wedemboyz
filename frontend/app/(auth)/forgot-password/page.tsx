import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordCard } from "@/components/auth/ForgotPasswordCard";

export default function ForgotPasswordPage() {
    return (
        <AuthShell
            eyebrow={["Real people"]}
            title="Forgot your password?"
            subtitle="We don't do password resets over the app yet — but a real person can sort you out in minutes."
        >
            <ForgotPasswordCard />
        </AuthShell>
    );
}