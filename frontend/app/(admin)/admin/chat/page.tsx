import { MessageCircleMore } from "lucide-react";

import { AdminChatSidebar } from "@/src/components/chat/AdminChatSidebar";

export default function AdminChatPage() {
  return <div className="flex h-full min-h-0"><AdminChatSidebar className="flex w-full md:hidden" /><div className="hidden flex-1 place-items-center bg-paper md:grid"><div className="max-w-sm text-center"><span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-navy-50 text-navy"><MessageCircleMore className="h-6 w-6" aria-hidden="true" /></span><h1 className="font-display text-xl font-semibold text-navy">Wedemboyz messages</h1><p className="mt-2 text-sm leading-relaxed text-ink-muted">Choose a conversation from the left to read and reply without leaving the inbox.</p></div></div></div>;
}
