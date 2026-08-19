import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui";

export function Pagination({
  currentPage,
  numPages,
  onPageChange,
}: {
  currentPage: number;
  numPages: number;
  onPageChange: (page: number) => void;
}) {
  if (numPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs text-ink-muted">
        Page {currentPage} of {numPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="px-2.5 py-1.5"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="secondary"
          className="px-2.5 py-1.5"
          disabled={currentPage >= numPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
