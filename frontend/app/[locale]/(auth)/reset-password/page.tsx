import type { Metadata } from "next";
import { AuthShell } from "@/src/components/auth/AuthShell";
import { ResetPasswordForm } from "@/src/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AuthShell
      eyebrow={["auth.accountHelp"]}
      title="auth.resetTitle"
      subtitle="auth.resetSubtitle"
    >
      <ResetPasswordForm
        uid={typeof params.uid === "string" ? params.uid : ""}
        token={typeof params.token === "string" ? params.token : ""}
      />
    </AuthShell>
  );
}
