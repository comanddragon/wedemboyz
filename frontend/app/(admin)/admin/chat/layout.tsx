import type { ReactNode } from "react";

import { AdminChatSidebar } from "@/src/components/chat/AdminChatSidebar";

export default function AdminChatLayout({ children }: { children: ReactNode }) {
  return <div className="h-full min-h-0 p-0 sm:p-4 lg:p-6"><div className="flex h-full min-h-0 overflow-hidden border-crease bg-white sm:rounded-2xl sm:border"><AdminChatSidebar className="hidden w-[360px] shrink-0 md:flex xl:w-[400px]" /><section className="min-h-0 min-w-0 flex-1">{children}</section></div></div>;
}
