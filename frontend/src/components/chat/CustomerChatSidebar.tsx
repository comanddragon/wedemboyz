"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCirclePlus, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/src/components/ui";
import { chatApi } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query-keys";
import type { ChatRoom } from "@/src/types";
import { CustomerAvatar } from "./CustomerAvatar";

export function CustomerChatSidebar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const params = useParams<{ roomId?: string }>();
  const activeRoomId = Number(params.roomId);
  const queryClient = useQueryClient();
  const { data: rooms, isLoading } = useQuery({ queryKey: queryKeys.chat.rooms, queryFn: () => chatApi.listChatRooms(), refetchInterval: 20_000 });
  const sortedRooms = useMemo(() => rooms?.toSorted((a, b) => (b.last_message?.created_at ?? b.updated_at).localeCompare(a.last_message?.created_at ?? a.updated_at)), [rooms]);
  const createRoom = useMutation({ mutationFn: () => chatApi.createChatRoom(), onSuccess: (room) => { queryClient.invalidateQueries({ queryKey: queryKeys.chat.rooms }); router.push(`/chat/${room.id}`); } });
  const openRoom = (room: ChatRoom) => { queryClient.setQueryData(queryKeys.chat.room(room.id), room); router.push(`/chat/${room.id}`); };

  return <aside className={`min-h-0 flex-col border-r border-crease bg-white ${className}`}>
    <div className="shrink-0 border-b border-crease p-4"><div className="mb-3 flex items-center justify-between"><div><h1 className="font-display text-lg font-semibold text-navy">Messages</h1><p className="text-[11px] text-ink-muted">Talk with the laundry team</p></div><MessageCirclePlus className="h-5 w-5 text-gold" aria-hidden="true" /></div><Button size="sm" className="w-full" onClick={() => createRoom.mutate()} disabled={createRoom.isPending}><Plus className="h-3.5 w-3.5" aria-hidden="true" />{createRoom.isPending ? "Starting…" : "New conversation"}</Button></div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{isLoading ? [0,1,2].map((item) => <div key={item} className="h-20 animate-pulse border-b border-crease bg-steam/35" />) : null}{!isLoading && !sortedRooms?.length ? <p className="p-8 text-center text-sm text-ink-muted">No conversations yet.</p> : null}{sortedRooms?.map((room) => { const active = room.id === activeRoomId; return <button key={room.id} type="button" onClick={() => openRoom(room)} className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-crease px-4 py-3 text-left transition-colors ${active ? "bg-navy-50" : "hover:bg-steam/45"}`}><CustomerAvatar name="Wedemboyz Support" size="sm" /><span className="min-w-0"><span className="flex items-center gap-2"><span className={`truncate text-sm ${room.unread_count ? "font-bold text-navy" : "font-semibold text-navy"}`}>{room.order ? `Order #${room.order.id}` : "Wedemboyz Support"}</span>{room.status === "CLOSED" ? <span className="shrink-0 text-[10px] font-medium text-ink-muted">Closed</span> : null}</span><span className={`mt-0.5 block truncate text-xs ${room.unread_count ? "font-semibold text-ink" : "text-ink-muted"}`}>{room.last_message?.content || "Conversation started"}</span></span><span className="text-right text-[10px] text-ink-faint">{new Date(room.last_message?.created_at ?? room.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{room.unread_count ? <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 font-semibold tabular-nums text-navy" aria-label={`${room.unread_count} unread messages`}>{room.unread_count > 99 ? "99+" : room.unread_count}</span> : null}</span></button>; })}</div>
  </aside>;
}
