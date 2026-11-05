import type { BadgeTier } from "@/src/types/discount";

export function CustomerAvatar({
  name,
  size = "md",
  className = "",
  imageUrl,
  useProfilePhoto = false,
  forceProfilePhoto = false,
  loyaltyTier,
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  imageUrl?: string | null;
  useProfilePhoto?: boolean;
  forceProfilePhoto?: boolean;
  loyaltyTier?: BadgeTier | null;
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
  // Initials avoid assigning a random gendered portrait to a customer's name.
  const initials = seed.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const displayUrl = imageUrl && (useProfilePhoto || forceProfilePhoto) ? imageUrl : null;
  const ring = loyaltyTier === "GOLD" ? "outline-gold"
    : loyaltyTier === "SILVER" ? "outline-silver"
    : loyaltyTier === "BRONZE" ? "outline-bronze" : "outline-crease";

  return (
    <span
      className={`${dimensions} relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-steam font-semibold text-navy ${className} ${loyaltyTier ? `outline outline-3 outline-offset-2 ${ring}` : "ring-1 ring-crease"}`}
      title={loyaltyTier ? `${loyaltyTier} membership` : undefined}
      role="img"
      aria-label={`${seed}${loyaltyTier ? ` · ${loyaltyTier} membership` : ""}`}
    >
      {displayUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={displayUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : <span aria-hidden="true" className="text-[0.8em]">{initials}</span>}
    </span>
  );
}
