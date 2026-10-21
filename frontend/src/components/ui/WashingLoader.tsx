import Image from "next/image";

// Logomark with a spinning drum. The body PNG has the porthole cleared, and
// the drum PNG sits underneath it and rotates. Geometry is in percent of the
// 454x431 mark: the drum is 130px wide, centered at (216, 269) in mark coordinates.
export function WashingLoader({ className = "w-24" }: { className?: string }) {
  return (
    <span
      className={`wm-loader relative block aspect-[454/431] ${className}`}
      aria-hidden="true"
    >
      <Image
        src="/loader/mark-drum.webp"
        alt=""
        width={130}
        height={130}
        priority
        className="wm-drum absolute h-auto w-[28.63%]"
        style={{ left: "33.26%", top: "47.33%" }}
      />
      <Image
        src="/loader/mark-body.webp"
        alt=""
        width={454}
        height={431}
        priority
        className="absolute inset-0 h-full w-full"
      />
    </span>
  );
}
