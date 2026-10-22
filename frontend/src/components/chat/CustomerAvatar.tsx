import { UserRound } from "lucide-react";

export function CustomerAvatar({
  name,
  size = "md",
  className = "",
  imageUrl,
  useProfilePhoto = false,
  forceProfilePhoto = false,
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  imageUrl?: string | null;
  useProfilePhoto?: boolean;
  forceProfilePhoto?: boolean;
}) {
  const dimensions =
    size === "xl"
      ? "h-20 w-20"
      : size === "xs"
      ? "h-7 w-7"
      : size === "sm"
        ? "h-9 w-9"
        : size === "lg"
          ? "h-12 w-12"
          : "h-10 w-10";
  const seed = name.trim() || "Wedemboyz customer";
  const avatarUrl = `https://api.dicebear.com/10.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=e7f0ff,dff5f2,fff7df,fdece7&radius=50`;
  const displayUrl = imageUrl && (useProfilePhoto || forceProfilePhoto) ? imageUrl : avatarUrl;

  return (
    <span className={`${dimensions} relative inline-flex shrink-0 overflow-hidden rounded-full bg-steam ring-1 ring-crease ${className}`}>
      {/* DiceBear provides deterministic illustrated fallbacks for customers without profile photos. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={displayUrl} alt={`${seed} avatar`} className="h-full w-full object-cover" loading="lazy" />
      <UserRound className="absolute inset-0 -z-10 m-auto h-1/2 w-1/2 text-ink-muted" aria-hidden="true" />
    </span>
  );
}
