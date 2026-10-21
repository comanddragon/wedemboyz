"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { SearchInput } from "@/src/components/admin/SearchInput";
import { Select } from "@/src/components/ui";
import { chatApi } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query-keys";
import type { ChatRoom, ChatRoomStatus } from "@/src/types";
import { CustomerAvatar } from "./CustomerAvatar";

type FilterValue = "ALL" | "UNASSIGNED" | ChatRoomStatus;

export function AdminChatSidebar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const params = useParams<{ roomId?: string }>();
  const activeRoomId = Number(params.roomId);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const { data: rooms, isLoading, error } = useQuery({ queryKey: queryKeys.chat.rooms, queryFn: () => chatApi.listChatRooms(), refetchInterval: 20_000 });

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rooms?.filter((room) => {
      const name = `${room.customer.first_name} ${room.customer.last_name}`.toLowerCase();
      const matchesFilter = filter === "ALL" || (filter === "UNASSIGNED" ? room.status === "OPEN" && room.agent === null : room.status === filter);
      return matchesFilter && (!term || name.includes(term) || room.customer.phone_number.includes(term) || String(room.order?.id ?? "").includes(term));
    }).toSorted((a, b) => {
      const aWeight = a.status === "OPEN" ? (a.agent ? 1 : 0) : 2;
      const bWeight = b.status === "OPEN" ? (b.agent ? 1 : 0) : 2;
      return aWeight - bWeight || (b.last_message?.created_at ?? b.updated_at).localeCompare(a.last_message?.created_at ?? a.updated_at);
    });
  }, [rooms, search, filter]);

  function openRoom(room: ChatRoom) {
    queryClient.setQueryData(queryKeys.chat.room(room.id), room);
    router.push(`/admin/chat/${room.id}`);
  }

  return <aside className={`min-h-0 flex-col border-r border-crease bg-white ${className}`} aria-label="Conversations">
    <div className="shrink-0 border-b border-crease p-4">
      <div className="mb-3 flex items-baseline justify-between"><div><h1 className="font-display text-lg font-semibold text-navy">Chats</h1><p className="text-[11px] text-ink-muted">{rooms?.filter((room) => room.status === "OPEN").length ?? 0} open conversations</p></div><MessageSquareText className="h-5 w-5 text-gold" aria-hidden="true" /></div>
      <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
      <Select value={filter} onChange={(event) => setFilter(event.target.value as FilterValue)} className="mt-2" aria-label="Filter conversations"><option value="ALL">All conversations</option><option value="UNASSIGNED">Unassigned</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></Select>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {error ? <p className="p-4 text-xs text-status-cancelled-text">Couldn&apos;t load conversations.</p> : null}
      {isLoading ? [0,1,2,3,4].map((item) => <div key={item} className="h-20 animate-pulse border-b border-crease bg-steam/35" />) : null}
      {!isLoading && filteredRooms?.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No conversations match.</p> : null}
      {filteredRooms?.map((room) => {
        const name = `${room.customer.first_name} ${room.customer.last_name}`.trim() || room.customer.phone_number;
        const active = room.id === activeRoomId;
        return <button key={room.id} type="button" onClick={() => openRoom(room)} className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-crease px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gold/30 ${active ? "bg-navy-50" : "hover:bg-steam/45"}`}>
          <CustomerAvatar name={name} size="sm" />
          <span className="min-w-0"><span className="flex items-center gap-2"><span className={`truncate text-sm ${room.unread_count ? "font-bold text-navy" : "font-semibold text-navy"}`}>{name}</span><span className={`shrink-0 text-[10px] font-medium ${room.status === "CLOSED" ? "text-ink-muted" : room.agent ? "text-status-ready-text" : "text-gold-600"}`}>{room.status === "CLOSED" ? "Closed" : room.agent ? "Assigned" : "Unassigned"}</span></span><span className={`mt-0.5 block truncate text-xs ${room.unread_count ? "font-semibold text-ink" : "text-ink-muted"}`}>{room.last_message?.content || "No messages yet"}</span></span>
          <span className="text-right"><span className="block text-[10px] text-ink-faint">{new Date(room.last_message?.created_at ?? room.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>{room.unread_count ? <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold tabular-nums text-navy" aria-label={`${room.unread_count} unread messages`}>{room.unread_count > 99 ? "99+" : room.unread_count}</span> : null}</span>
        </button>;
      })}
    </div>
  </aside>;
}
