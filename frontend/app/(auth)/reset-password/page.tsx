import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Reset Password</h1>
      <p style={{ color: "#666" }}>Backend has no /auth/password/reset/confirm/ endpoint yet.</p>
      <p>
        <Link href="/login">&larr; Back to login</Link>
      </p>
    </main>
  );
}
