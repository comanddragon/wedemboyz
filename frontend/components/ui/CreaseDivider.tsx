/**
 * The Fold Line signature element — a "crease": two thin hairlines close
 * together, evoking a garment fold, used to separate major sections instead
 * of a single divider or heavy card shadow.
 */
export function CreaseDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`my-6 ${className}`} aria-hidden="true">
      <div className="h-px bg-crease" />
      <div className="mt-[3px] h-px bg-crease" />
    </div>
  );
}
