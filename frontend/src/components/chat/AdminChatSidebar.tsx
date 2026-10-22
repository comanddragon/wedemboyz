"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { SearchInput } from "@/src/components/admin/SearchInput";
import { Select } from "@/src/components/ui";
import { chatApi, staffApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { ChatRoom, ChatRoomStatus } from "@/src/types";
import { CustomerAvatar } from "./CustomerAvatar";

type FilterValue = "ALL" | "UNASSIGNED" | ChatRoomStatus;

export function AdminChatSidebar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const params = useParams<{ roomId?: string }>();
  const activeRoomId = Number(params.roomId);
  const queryClient = useQueryClient();
  const { locale, t } = useI18n();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const { data: rooms, isLoading, error } = useQuery({
    queryKey: queryKeys.chat.rooms,
    queryFn: () => chatApi.listChatRooms(),
    refetchInterval: 20_000,
  });
  const { data: chatAgents } = useQuery({
    queryKey: [...queryKeys.staff.roster, "chat-available"],
    queryFn: () => staffApi.listChatAgents(),
  });
  const assignMutation = useMutation({
    mutationFn: ({ roomId, agentId }: { roomId: number; agentId: number }) =>
      chatApi.assignChatRoom(roomId, agentId),
    onSuccess: (updated) => {
      queryClient.setQueryData<ChatRoom[]>(queryKeys.chat.rooms, (current) =>
        current?.map((room) => (room.id === updated.id ? updated : room)),
      );
      queryClient.setQueryData(queryKeys.chat.room(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.roster });
    },
  });

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rooms
      ?.filter((room) => {
        const name =
          `${room.customer.first_name} ${room.customer.last_name}`.toLowerCase();
        const matchesFilter =
          filter === "ALL" ||
          (filter === "UNASSIGNED"
            ? room.status === "OPEN" && room.agent === null
            : room.status === filter);
        return (
          matchesFilter &&
          (!term ||
            name.includes(term) ||
            room.customer.phone_number.includes(term) ||
            String(room.order?.id ?? "").includes(term))
        );
      })
      .toSorted((a, b) => {
        const aWeight = a.status === "OPEN" ? (a.agent ? 1 : 0) : 2;
        const bWeight = b.status === "OPEN" ? (b.agent ? 1 : 0) : 2;
        return (
          aWeight - bWeight ||
          (b.last_message?.created_at ?? b.updated_at).localeCompare(
            a.last_message?.created_at ?? a.updated_at,
          )
        );
      });
  }, [rooms, search, filter]);

  function openRoom(room: ChatRoom) {
    queryClient.setQueryData(queryKeys.chat.room(room.id), room);
    router.push(`/admin/chat/${room.id}`);
  }

  const openCount = rooms?.filter((room) => room.status === "OPEN").length ?? 0;

  return (
    <aside
      className={`min-h-0 flex-col border-r border-crease bg-white ${className}`}
      aria-label="Conversations"
    >
      <div className="shrink-0 border-b border-crease p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h1 className="font-display text-lg font-semibold text-navy">
              {t("adminChat.title")}
            </h1>
            <p className="text-[11px] text-ink-muted">
              {openCount} {t("adminChat.openConversations")}
            </p>
          </div>
          <MessageSquareText className="h-5 w-5 text-gold" aria-hidden="true" />
        </div>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("adminChat.search")}
          aria-label={t("adminChat.search")}
        />
        <Select
          value={filter}
          onChange={(event) => setFilter(event.target.value as FilterValue)}
          className="mt-2"
          aria-label={t("adminChat.search")}
        >
          <option value="ALL">{t("adminChat.all")}</option>
          <option value="UNASSIGNED">{t("adminChat.unassigned")}</option>
          <option value="OPEN">{t("adminChat.open")}</option>
          <option value="CLOSED">{t("adminChat.closed")}</option>
        </Select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {error ? (
          <p className="p-4 text-xs text-status-cancelled-text">
            {t("adminChat.loadError")}
          </p>
        ) : null}
        {isLoading
          ? [0, 1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse border-b border-crease bg-steam/35"
              />
            ))
          : null}
        {!isLoading && filteredRooms?.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            {t("adminChat.noConversations")}
          </p>
        ) : null}
        {filteredRooms?.map((room) => {
          const name =
            `${room.customer.first_name} ${room.customer.last_name}`.trim() ||
            room.customer.phone_number;
          const active = room.id === activeRoomId;
          return (
            <article
              key={room.id}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center border-b border-crease pr-3 transition-colors ${active ? "bg-navy-50" : "hover:bg-steam/45"}`}
            >
              <button
                type="button"
                onClick={() => openRoom(room)}
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gold/30"
              >
                <CustomerAvatar name={name} size="sm" imageUrl={room.customer.avatar} useProfilePhoto={room.customer.use_profile_photo} />
                <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span
                    className={`truncate text-sm ${room.unread_count ? "font-bold text-navy" : "font-semibold text-navy"}`}
                  >
                    {name}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-medium ${room.status === "CLOSED" ? "text-ink-muted" : room.agent ? "text-status-ready-text" : "text-gold-600"}`}
                  >
                    {room.status === "CLOSED"
                      ? t("adminChat.closed")
                      : room.agent
                        ? t("adminChat.assigned")
                        : t("adminChat.unassigned")}
                  </span>
                </span>
                <span
                  className={`mt-0.5 block truncate text-xs ${room.unread_count ? "font-semibold text-ink" : "text-ink-muted"}`}
                >
                  {room.last_message?.content || t("adminChat.noMessagesYet")}
                </span>
                </span>
              </button>
              <span className="flex flex-col items-end gap-1.5 text-right">
                <span className="block text-[10px] text-ink-faint">
                  {new Date(
                    room.last_message?.created_at ?? room.updated_at,
                  ).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {room.unread_count ? (
                  <span
                    className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold tabular-nums text-navy"
                    aria-label={t("adminChat.unreadMessagesAria").replace(
                      "{count}",
                      String(room.unread_count),
                    )}
                  >
                    {room.unread_count > 99 ? "99+" : room.unread_count}
                  </span>
                ) : null}
                {room.status === "OPEN" && room.agent === null ? (
                  <select
                    value=""
                    disabled={assignMutation.isPending}
                    onChange={(event) => {
                      const agentId = Number(event.target.value);
                      if (agentId) assignMutation.mutate({ roomId: room.id, agentId });
                    }}
                    className="max-w-28 rounded-lg border border-crease bg-white px-2 py-1 text-[10px] font-semibold text-navy outline-none transition-colors hover:border-gold focus:border-gold disabled:opacity-50"
                    aria-label={t("adminChat.assignConversation").replace("{name}", name)}
                  >
                    <option value="">{t("adminChat.assign")}</option>
                    {chatAgents?.map((person) => {
                      const agentName = `${person.user.first_name} ${person.user.last_name}`.trim() || person.user.phone_number;
                      return <option key={person.user.id} value={person.user.id}>{agentName}</option>;
                    })}
                  </select>
                ) : null}
                {assignMutation.isError && assignMutation.variables?.roomId === room.id ? (
                  <span className="max-w-32 text-[10px] leading-tight text-status-cancelled-text" role="alert">
                    {getApiErrorMessage(assignMutation.error)}
                  </span>
                ) : null}
              </span>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
