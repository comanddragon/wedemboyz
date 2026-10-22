"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/src/i18n/I18nProvider";
import { Button } from "@/src/components/ui";

export function Pagination({
  currentPage,
  numPages,
  onPageChange,
}: {
  currentPage: number;
  numPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useI18n();
  if (numPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs text-ink-muted">
        {t("adminCommon.page")} {currentPage} {t("adminCommon.of")} {numPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="px-2.5 py-1.5"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label={t("adminCommon.previousPage")}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="secondary"
          className="px-2.5 py-1.5"
          disabled={currentPage >= numPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label={t("adminCommon.nextPage")}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
