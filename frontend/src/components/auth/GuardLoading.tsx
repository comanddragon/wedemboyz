import { WashingLoader } from "@/src/components/ui/WashingLoader";

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
        <WashingLoader className="w-28" />
        <p className="mt-4 font-display text-sm font-medium text-navy">
          {label}
        </p>
      </div>
    </div>
  );
}
