import type { ReactNode } from "react";

import { AdminChatSidebar } from "@/src/components/chat/AdminChatSidebar";

// `admin-chat-root` (globals.css) makes this page fill exactly the space above
// the mobile bottom tab bar instead of the shell's generic bottom padding, and
// the card is full-bleed below `lg` so no extra gutter sits above the bar.
export default function AdminChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-chat-root h-full min-h-0 p-0 lg:p-6">
      <div className="flex h-full min-h-0 overflow-hidden border-crease bg-white lg:rounded-2xl lg:border">
        <AdminChatSidebar className="hidden w-[360px] shrink-0 md:flex xl:w-[400px]" />
        <section className="min-h-0 min-w-0 flex-1">{children}</section>
      </div>
    </div>
  );
}
