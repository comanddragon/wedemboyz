import Image from "next/image";

export function GuardLoading({
  label = "Loading your workspace",
}: {
  label?: string;
}) {
  return (
    <div
      className="grid min-h-screen place-items-center bg-paper px-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-white shadow-card">
          <Image
            src="/icon-mark.png"
            alt=""
            width={36}
            height={44}
            className="h-11 w-auto object-contain"
            priority
          />
        </span>
        <p className="mt-4 font-display text-sm font-medium text-navy">
          {label}
        </p>
        <span className="mt-3 h-1 w-20 overflow-hidden rounded-full bg-crease">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-gold motion-reduce:animate-none" />
        </span>
      </div>
    </div>
  );
}
