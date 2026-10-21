"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  ChatComposer,
  type ChatComposerSubmission,
} from "@/src/components/chat/ChatComposer";
import { MessageAttachments } from "@/src/components/chat/MessageAttachments";
import { Button, Select, StatusBadge } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/useAuth";
import { useSocket } from "@/src/hooks/useSocket";
import { chatApi, staffApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import { useChatStore } from "@/src/lib/stores/chat.store";
import type { ChatMessage } from "@/src/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function ConnectionPill({ status }: { status: string }) {
  if (status === "open") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-status-ready-text">
        <span className="h-1.5 w-1.5 rounded-full bg-status-ready-text" />
        Live
      </span>
    );
  }
  if (status === "connecting") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
        Connecting…
      </span>
    );
  }
  // "closed" / "error" / "idle" — chat still works via REST send, so keep
  // this reassuring rather than alarming.
  return (
    <span className="flex items-center gap-1.5 text-xs text-ink-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-ink-muted/50" />
      Messages send normally
    </span>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-3 px-6 py-6">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}
        >
          <span
            className={`block h-9 animate-pulse rounded-2xl bg-steam ${i % 2 ? "w-40" : "w-52"}`}
          />
        </div>
      ))}
    </div>
  );
}

export default function AdminChatRoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = Number(params.roomId);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const scrollRef = useRef<HTMLDivElement>(null);

  const setRoomHistory = useChatStore((state) => state.setRoomHistory);

  const roomQuery = useQuery({
    queryKey: queryKeys.chat.room(roomId),
    queryFn: () => chatApi.getChatRoom(roomId),
    enabled: Number.isFinite(roomId),
  });

  const staffQuery = useQuery({
    queryKey: [...queryKeys.staff.roster, "chat-available"],
    queryFn: () => staffApi.listChatAgents(),
  });

  const roomActionMutation = useMutation({
    mutationFn: async (
      action: "claim" | "close" | "reopen" | number | null,
    ) => {
      if (action === "claim") return chatApi.claimChatRoom(roomId);
      if (action === "close") return chatApi.closeChatRoom(roomId);
      if (action === "reopen") return chatApi.reopenChatRoom(roomId);
      return chatApi.assignChatRoom(roomId, action);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.chat.room(roomId), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.rooms });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.roster });
    },
  });

  // REST backfill of history on mount — live delivery is via the socket.
  const historyQuery = useQuery({
    queryKey: queryKeys.chat.messages(roomId, 1),
    queryFn: () => chatApi.listMessages(roomId, 1),
    enabled: Number.isFinite(roomId),
  });

  useEffect(() => {
    if (historyQuery.data) {
      const chronological = [...historyQuery.data.results].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      setRoomHistory(roomId, chronological);
    }
  }, [historyQuery.data, roomId, setRoomHistory]);

  useEffect(() => {
    if (Number.isFinite(roomId)) {
      chatApi.markRoomRead(roomId).catch(() => {
        // Best-effort — an unread badge lingering a little longer isn't worth
        // surfacing an error for.
      });
    }
  }, [roomId]);

  const { status, messages, send } = useSocket(
    Number.isFinite(roomId) ? roomId : null,
  );

  // REST fallback so the page is usable even while the websocket's backend
  // auth middleware is still pending (see lib/ws/chatSocket.ts) — also the
  // only path for attachments, since the websocket protocol is text-only.
  const sendMutation = useMutation({
    mutationFn: (submission: ChatComposerSubmission) =>
      chatApi.sendMessage(roomId, submission),
    onSuccess: (message) => {
      // Merge the full server response (with real attachment URLs) into
      // the store instead of the socket's minimal echo shape — setRoomHistory
      // merges by id, so this safely overwrites any optimistic placeholder.
      setRoomHistory(roomId, [message]);
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.rooms });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function handleComposerSend({
    content,
    attachments,
  }: ChatComposerSubmission) {
    // Attachments always go through REST (the socket protocol is text-only);
    // a plain text message prefers the live socket when it's open.
    if (attachments.length === 0 && status === "open") {
      try {
        send(content);
        return;
      } catch {
        // fall through to REST
      }
    }
    sendMutation.mutate({ content, attachments });
  }

  const room = roomQuery.data;
  const customerName = room?.customer
    ? `${room.customer.first_name ?? ""} ${room.customer.last_name ?? ""}`.trim()
    : "";

  return (
    <div className="mx-auto flex h-screen max-w-5xl flex-col">
      <div className="flex flex-col gap-3 border-b border-crease px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/chat"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-steam hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div>
            <p className="text-sm font-semibold text-navy">
              {customerName || `Conversation #${roomId}`}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              {room?.order && (
                <Link
                  href={`/admin/orders/${room.order.id}`}
                  className="inline-flex items-center gap-1 hover:text-navy"
                >
                  Order #{room.order.id}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {room?.customer && <span>{room.customer.phone_number}</span>}
              <ConnectionPill status={status} />
            </p>
          </div>
        </div>
        {room && (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={room.agent?.id ?? ""}
              disabled={
                roomActionMutation.isPending || room.status === "CLOSED"
              }
              onChange={(event) =>
                roomActionMutation.mutate(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="w-44"
              aria-label="Assigned staff member"
            >
              <option value="">Unassigned</option>
              {staffQuery.data?.map((person) => {
                const name =
                  `${person.user.first_name} ${person.user.last_name}`.trim() ||
                  person.user.phone_number;
                return (
                  <option key={person.user.id} value={person.user.id}>
                    {name} · {person.open_chat_count}
                  </option>
                );
              })}
            </Select>
            {room.status === "OPEN" && room.agent?.id !== user?.id && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => roomActionMutation.mutate("claim")}
              >
                Claim
              </Button>
            )}
            <Button
              size="sm"
              variant={room.status === "OPEN" ? "ghost" : "secondary"}
              onClick={() =>
                roomActionMutation.mutate(
                  room.status === "OPEN" ? "close" : "reopen",
                )
              }
            >
              {room.status === "OPEN" ? "Close" : "Reopen"}
            </Button>
            <StatusBadge
              label={room.status}
              tone={room.status === "OPEN" ? "ready" : "pending"}
            />
          </div>
        )}
      </div>

      {roomActionMutation.isError && (
        <p className="border-b border-crease bg-status-cancelled-bg px-6 py-2 text-xs text-status-cancelled-text">
          {getApiErrorMessage(roomActionMutation.error)}
        </p>
      )}

      {roomQuery.isError && (
        <p className="border-b border-crease bg-status-cancelled-bg px-6 py-2 text-xs text-status-cancelled-text">
          Couldn&apos;t load conversation details — messages below may still
          work.
        </p>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-paper">
        {historyQuery.isLoading ? (
          <MessagesSkeleton />
        ) : (
          <div className="flex min-h-full flex-col justify-end">
            <div className="space-y-1 px-6 py-6">
              {messages.length === 0 && (
                <p className="py-12 text-center text-sm text-ink-muted">
                  No messages yet — say hello.
                </p>
              )}
              {messages.map((message: ChatMessage, i) => {
                const isMine = user ? message.sender === user.id : false;
                const previous = messages[i - 1];
                const showDayLabel =
                  !previous ||
                  new Date(previous.created_at).toDateString() !==
                    new Date(message.created_at).toDateString();
                const showSenderName =
                  !isMine &&
                  (!previous ||
                    previous.sender !== message.sender ||
                    showDayLabel);

                return (
                  <div key={message.id || i}>
                    {showDayLabel && (
                      <p className="my-4 text-center text-xs font-medium uppercase tracking-wide text-ink-muted/60">
                        {formatDayLabel(message.created_at)}
                      </p>
                    )}
                    <div
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}
                      >
                        {showSenderName && (
                          <span className="mb-1 px-1 text-xs text-ink-muted">
                            {message.sender_name || customerName || "Customer"}
                          </span>
                        )}
                        <div
                          className={`flex flex-col gap-1.5 rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                            isMine
                              ? "rounded-br-sm bg-navy text-white"
                              : "rounded-bl-sm bg-white text-ink"
                          } ${message.content ? "" : "p-1.5"}`}
                        >
                          {message.content && <span>{message.content}</span>}
                          {message.attachments?.length > 0 && (
                            <MessageAttachments
                              attachments={message.attachments}
                              isMine={isMine}
                            />
                          )}
                        </div>
                        <span className="mt-1 px-1 text-[0.7rem] text-ink-muted/70">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ChatComposer
        onSend={handleComposerSend}
        isSending={sendMutation.isPending}
        error={
          sendMutation.isError ? getApiErrorMessage(sendMutation.error) : null
        }
      />
    </div>
  );
}
