import type { ReactNode } from "react";
import { CustomerChatSidebar } from "@/src/components/chat/CustomerChatSidebar";

export default function CustomerChatLayout({ children }: { children: ReactNode }) {
  return <div className="h-full min-h-0 p-0 sm:p-4 lg:p-6"><div className="flex h-full min-h-0 overflow-hidden border-crease bg-white sm:rounded-2xl sm:border"><CustomerChatSidebar className="hidden w-[340px] shrink-0 md:flex xl:w-[380px]" /><section className="min-h-0 min-w-0 flex-1">{children}</section></div></div>;
}
