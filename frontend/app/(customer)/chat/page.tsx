import { MessageCircleMore } from "lucide-react";
import { CustomerChatSidebar } from "@/src/components/chat/CustomerChatSidebar";

export default function ChatPage() {
  return <div className="flex h-full min-h-0"><CustomerChatSidebar className="flex w-full md:hidden" /><div className="hidden flex-1 place-items-center bg-paper md:grid"><div className="max-w-sm text-center"><span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-gold-50 text-gold-600"><MessageCircleMore className="h-6 w-6" aria-hidden="true" /></span><h1 className="font-display text-xl font-semibold text-navy">We&apos;re here to help</h1><p className="mt-2 text-sm leading-relaxed text-ink-muted">Choose a conversation to ask about an order, payment, pickup, or delivery.</p></div></div></div>;
}
