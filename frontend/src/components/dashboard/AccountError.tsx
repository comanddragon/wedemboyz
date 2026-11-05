"use client";

import { Button } from "@/src/components/ui/Button";
import { useI18n } from "@/src/i18n/I18nProvider";
import { getApiErrorMessage } from "@/src/lib/api/errors";

/** Recovery shared by account panels; failed requests never resemble empty data. */
export function AccountError({ error, onRetry, pending = false }: {
  error: unknown;
  onRetry: () => void;
  pending?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-status-cancelled-text/25 bg-status-cancelled-bg p-4 text-sm text-status-cancelled-text">
      <p className="min-w-0 flex-1 break-words">{getApiErrorMessage(error)}</p>
      <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={onRetry}>
        {t("payments.retry")}
      </Button>
    </div>
  );
}
