"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MessageCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SearchInput } from "@/components/admin/SearchInput";
import { TableContainer, TableEmptyRow, TableSkeleton, TBody, Td, Th, THead, Tr } from "@/components/admin/Table";
import { Button, Select, StatusBadge, chatRoomStatusTone } from "@/components/ui";
import { chatApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { ChatRoom, ChatRoomStatus } from "@/types";

type FilterValue = "ALL" | "UNASSIGNED" | ChatRoomStatus;

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
    { value: "ALL", label: "All conversations" },
    { value: "UNASSIGNED", label: "Unassigned & open" },
    { value: "OPEN", label: "Open" },
    { value: "CLOSED", label: "Closed" },
];

export default function AdminChatPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterValue>("ALL");

    const { data: rooms, isLoading, error } = useQuery({
        queryKey: queryKeys.chat.rooms,
        queryFn: () => chatApi.listChatRooms(),
    });

    const closeMutation = useMutation({
        mutationFn: (roomId: number) => chatApi.closeChatRoom(roomId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chat.rooms }),
    });

    // Unassigned-and-open first, then open, then closed, most recent activity first within each group.
    const roomWeight = (r: ChatRoom) => (r.status === "OPEN" ? (r.agent === null ? 0 : 1) : 2);
    const lastActivity = (r: ChatRoom) => r.last_message?.created_at ?? r.updated_at;

    // We already have the full room object from the list fetch — seed the
    // detail query's cache with it before navigating so the thread page has
    // customer/order info to render on first paint instead of sitting on a
    // second round-trip to GET /chat/rooms/{id}/.
    function openRoom(room: ChatRoom) {
        queryClient.setQueryData(queryKeys.chat.room(room.id), room);
        router.push(`/admin/chat/${room.id}`);
    }

    const filteredRooms = useMemo(() => {
        if (!rooms) return undefined;
        const term = search.trim().toLowerCase();
        return rooms
            .filter((r) => {
                const matchesFilter =
                    filter === "ALL" ||
                    (filter === "UNASSIGNED" ? r.status === "OPEN" && r.agent === null : r.status === filter);
                const fullName =
                    `${r.customer.first_name} ${r.customer.last_name}`.toLowerCase();

                const matchesSearch =
                    term === "" ||
                    fullName.includes(term) ||
                    (r.order !== null && String(r.order).includes(term));
                return matchesFilter && matchesSearch;
            })
            .sort((a, b) => roomWeight(a) - roomWeight(b) || lastActivity(b).localeCompare(lastActivity(a)));
    }, [rooms, search, filter]);

    const openCount = rooms?.filter((r) => r.status === "OPEN").length ?? 0;

    return (
        <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
            <AdminPageHeader
                title="Chat inbox"
                description={rooms ? `${openCount} open conversation${openCount === 1 ? "" : "s"} · unassigned and open surface first.` : "Unassigned and open conversations surface first."}
            />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <SearchInput
                    placeholder="Search by customer # or order #"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="sm:max-w-xs"
                    aria-label="Search conversations"
                />
                <Select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as FilterValue)}
                    className="sm:w-52"
                    aria-label="Filter conversations"
                >
                    {FILTER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </Select>
            </div>

            {error && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>}
            {closeMutation.error && (
                <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(closeMutation.error)}</p>
            )}

            <TableContainer>
                <THead>
                    <Th>Customer</Th>
                    <Th>Order</Th>
                    <Th>Agent</Th>
                    <Th>Last message</Th>
                    <Th>Status</Th>
                    <Th align="right">Unread</Th>
                    <Th className="w-24" />
                </THead>
                <TBody>
                    {isLoading && <TableSkeleton columns={7} />}

                    {!isLoading && filteredRooms && filteredRooms.length === 0 && (
                        <TableEmptyRow colSpan={7}>
                            {rooms && rooms.length === 0
                                ? "Customer chat rooms will show up here as soon as someone starts one from the customer app."
                                : "No conversations match your search or filter."}
                        </TableEmptyRow>
                    )}

                    {!isLoading &&
                        filteredRooms?.map((room) => (
                            <Tr key={room.id} onClick={() => openRoom(room)}>
                                <Td className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-steam text-navy">
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                      {room.customer.first_name} {room.customer.last_name}
                  </span>
                                </Td>
                                <Td className="text-ink-muted">{room.order ? `#${room.order}` : "—"}</Td>
                                <Td className="text-ink-muted">{room.agent === null ? "Unassigned" : `#${room.agent}`}</Td>
                                <Td className="max-w-[220px] truncate text-ink-muted">
                                    {room.last_message ? room.last_message.content.slice(0, 60) : "—"}
                                </Td>
                                <Td>
                                    <StatusBadge label={room.status} tone={chatRoomStatusTone(room.status)} />
                                </Td>
                                <Td align="right">
                                    {room.unread_count > 0 ? (
                                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-medium text-navy">
                      {room.unread_count}
                    </span>
                                    ) : (
                                        <span className="text-ink-muted">—</span>
                                    )}
                                </Td>
                                <Td>
                                    <div className="flex items-center justify-end gap-2">
                                        {room.status === "OPEN" && (
                                            <Button
                                                variant="ghost"
                                                className="px-2 py-1 text-xs"
                                                disabled={closeMutation.isPending}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    closeMutation.mutate(room.id);
                                                }}
                                                aria-label={`Close conversation with customer #${room.customer}`}
                                            >
                                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                                                Close
                                            </Button>
                                        )}
                                        <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                                    </div>
                                </Td>
                            </Tr>
                        ))}
                </TBody>
            </TableContainer>
        </main>
    );
}