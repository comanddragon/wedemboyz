"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { Button, Card, EyebrowLabel, StatusBadge } from "@/components/ui";
import { chatApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ChatRoom } from "@/types";

function relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function RoomsSkeleton() {
    return (
        <div className="space-y-2">
            {[0, 1, 2].map((i) => (
                <Card key={i} className="flex items-center gap-4">
                    <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-steam" />
                    <div className="flex-1 space-y-2">
                        <span className="block h-3 w-1/4 animate-pulse rounded bg-steam" />
                        <span className="block h-3 w-2/3 animate-pulse rounded bg-steam" />
                    </div>
                </Card>
            ))}
        </div>
    );
}

export default function ChatPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: rooms, isLoading } = useQuery({
        queryKey: queryKeys.chat.rooms,
        queryFn: () => chatApi.listChatRooms(),
    });

    // Most recent activity first — a room with a newer last message (or, for
    // a room with no messages yet, a more recent updated_at) surfaces higher.
    const sortedRooms = useMemo(() => {
        if (!rooms) return undefined;
        const lastActivity = (r: ChatRoom) => r.last_message?.created_at ?? r.updated_at;
        return [...rooms].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));
    }, [rooms]);

    const createRoomMutation = useMutation({
        mutationFn: () => chatApi.createChatRoom(),
        onSuccess: (room) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.chat.rooms });
            router.push(`/chat/${room.id}`);
        },
    });

    return (
        <main className="mx-auto max-w-2xl px-6 py-10">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <EyebrowLabel words={["Support"]} />
                    <h1 className="font-display mt-1 text-xl font-semibold text-navy">Chat</h1>
                </div>
                <Button onClick={() => createRoomMutation.mutate()} disabled={createRoomMutation.isPending}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {createRoomMutation.isPending ? "Starting..." : "New conversation"}
                </Button>
            </div>

            {isLoading && <RoomsSkeleton />}

            {!isLoading && rooms && rooms.length === 0 && (
                <Card className="flex flex-col items-center gap-2 py-12 text-center">
                    <MessageCircle className="h-6 w-6 text-ink-muted" aria-hidden="true" />
                    <p className="text-sm font-medium text-ink">No conversations yet</p>
                    <p className="max-w-xs text-xs text-ink-muted">
                        Start a conversation if you have a question about an order, a payment, or anything
                        else — our team will pick it up from here.
                    </p>
                </Card>
            )}

            {!isLoading && sortedRooms && sortedRooms.length > 0 && (
                <ul className="space-y-2">
                    {sortedRooms.map((room) => (
                        <li key={room.id}>
                            <Link href={`/chat/${room.id}`}>
                                <Card className="flex items-center gap-4 transition-colors hover:bg-steam">
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy">
                    <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
                      {room.unread_count > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[0.65rem] font-bold text-navy-deep">
                        {room.unread_count > 9 ? "9+" : room.unread_count}
                      </span>
                      )}
                  </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className={`text-sm ${room.unread_count > 0 ? "font-semibold text-ink" : "font-medium text-ink"}`}>
                                                {room.order ? `Order #${room.order.id}` : `Conversation #${room.id}`}
                                            </p>
                                            {room.last_message && (
                                                <span className="shrink-0 text-xs text-ink-muted">
                          {relativeTime(room.last_message.created_at)}
                        </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 truncate text-sm text-ink-muted">
                                            {room.last_message?.content ?? "No messages yet"}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        label={room.status}
                                        tone={room.status === "OPEN" ? "ready" : "pending"}
                                    />
                                </Card>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}