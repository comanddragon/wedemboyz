"use client";

import { MessageCircleMore } from "lucide-react";

import { AdminChatSidebar } from "@/src/components/chat/AdminChatSidebar";
import { useI18n } from "@/src/i18n/I18nProvider";

export default function AdminChatPage() {
  const { t } = useI18n();

  return (
    <div className="flex h-full min-h-0">
      <AdminChatSidebar className="flex w-full md:hidden" />
      <div className="hidden flex-1 place-items-center bg-paper md:grid">
        <div className="max-w-sm text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-navy-50 text-navy">
            <MessageCircleMore className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-display text-xl font-semibold text-navy">
            {t("adminChat.placeholderTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {t("adminChat.selectConversation")}
          </p>
        </div>
      </div>
    </div>
  );
}
