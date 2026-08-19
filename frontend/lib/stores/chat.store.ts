import { create } from "zustand";

import type { ChatMessage, WsInboundMessage } from "@/types";

type SocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

interface ChatState {
    activeRoomId: number | null;
    socketStatus: SocketStatus;
    messagesByRoom: Record<number, ChatMessage[]>;

    setActiveRoom: (roomId: number | null) => void;
    setSocketStatus: (status: SocketStatus) => void;
    setRoomHistory: (roomId: number, messages: ChatMessage[]) => void;
    appendIncoming: (roomId: number, incoming: WsInboundMessage) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
    activeRoomId: null,
    socketStatus: "idle",
    messagesByRoom: {},

    setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

    setSocketStatus: (status) => set({ socketStatus: status }),

    setRoomHistory: (roomId, messages) =>
        set((state) => {
            // The REST history fetch can be served from a stale react-query cache
            // (staleTime is 30s) — if the person sent a message and then left/
            // re-entered the room quickly, that snapshot may predate the message
            // that's already sitting correctly in the store. Merge by id instead
            // of replacing outright, so a stale fetch can never erase something
            // newer that's already live. Fetched entries win on id collisions
            // (server copy is authoritative), but anything present locally and
            // absent from the fetch (e.g. very recently sent) is kept.
            const existing = state.messagesByRoom[roomId] ?? [];
            const byId = new Map<number, ChatMessage>();
            for (const m of existing) byId.set(m.id, m);
            for (const m of messages) byId.set(m.id, m);

            const merged = Array.from(byId.values()).sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );

            return {
                messagesByRoom: { ...state.messagesByRoom, [roomId]: merged },
            };
        }),

    appendIncoming: (roomId, incoming) =>
        set((state) => {
            // WsInboundMessage is a narrower shape than ChatMessage (no sender_name/
            // attachments/read_at yet) — normalize so the message list can render
            // both REST history and live socket messages uniformly.
            const normalized: ChatMessage = {
                id: Number(incoming.id) || 0,
                room: Number(incoming.room_id),
                sender: incoming.sender_id,
                sender_name: "",
                content: incoming.content,
                attachments: [],
                read_at: null,
                created_at: incoming.created_at,
            };

            const existing = state.messagesByRoom[roomId] ?? [];
            return {
                messagesByRoom: { ...state.messagesByRoom, [roomId]: [...existing, normalized] },
            };
        }),
}));