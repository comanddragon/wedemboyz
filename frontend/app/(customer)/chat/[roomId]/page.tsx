"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { ChatComposer, type ChatComposerSubmission } from "@/components/chat/ChatComposer";
import { MessageAttachments } from "@/components/chat/MessageAttachments";
import { StatusBadge } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { chatApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import { useChatStore } from "@/lib/stores/chat.store";
import type { ChatMessage } from "@/types";

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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
            <span className="flex items-center gap-1.5 text-xs text-ok-green">
        <span className="h-1.5 w-1.5 rounded-full bg-ok-green" />
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
                <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
          <span
              className={`block h-9 animate-pulse rounded-2xl bg-steam ${i % 2 ? "w-40" : "w-52"}`}
          />
                </div>
            ))}
        </div>
    );
}

export default function ChatRoomPage() {
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

    // REST backfill of history on mount — live delivery is via the socket.
    const historyQuery = useQuery({
        queryKey: queryKeys.chat.messages(roomId, 1),
        queryFn: () => chatApi.listMessages(roomId, 1),
        enabled: Number.isFinite(roomId),
    });

    useEffect(() => {
        if (historyQuery.data) {
            const chronological = [...historyQuery.data.results].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
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

    const { status, messages, send } = useSocket(Number.isFinite(roomId) ? roomId : null);

    // REST fallback so the page is usable even while the websocket's backend
    // auth middleware is still pending (see lib/ws/chatSocket.ts) — also the
    // only path for attachments, since the websocket protocol is text-only.
    const sendMutation = useMutation({
        mutationFn: (submission: ChatComposerSubmission) => chatApi.sendMessage(roomId, submission),
        onSuccess: (message) => {
            // Merge the full server response (with real attachment URLs) into
            // the store instead of the socket's minimal echo shape — setRoomHistory
            // merges by id, so this safely overwrites any optimistic placeholder.
            setRoomHistory(roomId, [message]);
            queryClient.invalidateQueries({ queryKey: queryKeys.chat.rooms });
        },
    });

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    function handleComposerSend({ content, attachments }: ChatComposerSubmission) {
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

    return (
        <div className="mx-auto flex h-screen max-w-2xl flex-col">
            <div className="flex items-center justify-between border-b border-crease px-6 py-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/chat"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-steam hover:text-ink"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <div>
                        <p className="text-sm font-semibold text-navy">
                            {room?.order ? `Order #${room.order.id}` : `Conversation #${roomId}`}
                        </p>
                        <ConnectionPill status={status} />
                    </div>
                </div>
                {room && <StatusBadge label={room.status} tone={room.status === "OPEN" ? "ready" : "pending"} />}
            </div>

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
                                    !isMine && (!previous || previous.sender !== message.sender || showDayLabel);

                                return (
                                    <div key={message.id || i}>
                                        {showDayLabel && (
                                            <p className="my-4 text-center text-xs font-medium uppercase tracking-wide text-ink-muted/60">
                                                {formatDayLabel(message.created_at)}
                                            </p>
                                        )}
                                        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                                                {showSenderName && (
                                                    <span className="mb-1 px-1 text-xs text-ink-muted">
                          {message.sender_name || "Support"}
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
                                                        <MessageAttachments attachments={message.attachments} isMine={isMine} />
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
                error={sendMutation.isError ? getApiErrorMessage(sendMutation.error) : null}
            />
        </div>
    );
}