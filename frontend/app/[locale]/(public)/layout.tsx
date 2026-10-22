import { BubbleOverlay } from "@/src/components/effects/BubbleOverlay";
import { SiteShell } from "@/src/components/layout/SiteShell";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteShell>
      <BubbleOverlay />
      <div className="flex min-h-screen flex-col">{children}</div>
    </SiteShell>
  );
}
