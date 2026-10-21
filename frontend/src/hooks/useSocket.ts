"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { queryKeys } from "@/src/lib/query-keys";
import { chatApi } from "@/src/lib/api";
import { clearRoomUnread } from "@/src/lib/chat-cache";
import { useChatStore } from "@/src/lib/stores/chat.store";
import { ChatSocket } from "@/src/lib/ws/chatSocket";

/**
 * Opens a ChatSocket for `roomId` on mount, tears it down on unmount/roomId
 * change. One call site per open chat thread (see (customer)/chat/[roomId]).
 *
 * NOTE: until the backend gets a JWT-aware Channels auth middleware (see
 * lib/ws/chatSocket.ts and the backend README), connections will be rejected
 * as AnonymousUser — this hook will report socketStatus "error"/"closed" in
 * a loop rather than ever reaching "open".
 */
export function useSocket(roomId: number | null) {
  const socketRef = useRef<ChatSocket | null>(null);
  const queryClient = useQueryClient();
  const setSocketStatus = useChatStore((state) => state.setSocketStatus);
  const appendIncoming = useChatStore((state) => state.appendIncoming);
  const socketStatus = useChatStore((state) => state.socketStatus);
  const messages = useChatStore((state) =>
    roomId !== null ? state.messagesByRoom[roomId] : undefined,
  );

  useEffect(() => {
    if (roomId === null) return;

    const socket = new ChatSocket(roomId);
    socketRef.current = socket;

    const unsubStatus = socket.on("status", setSocketStatus);
    const unsubMessage = socket.on("message", (message) => {
      appendIncoming(roomId, message);
      // Live messages (yours, echoed back, or the other party's) don't
      // otherwise touch the rooms list query — only the REST-fallback send
      // path invalidates it. Without this, the inbox's last_message/
      // unread_count goes stale for the life of the socket connection.
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.rooms });
      chatApi.markRoomRead(roomId).then(
        () => clearRoomUnread(queryClient, roomId),
        () => undefined,
      );
    });

    socket.connect();

    return () => {
      unsubStatus();
      unsubMessage();
      socket.close();
      socketRef.current = null;
    };
  }, [roomId, setSocketStatus, appendIncoming, queryClient]);

  const send = (content: string) => {
    if (!socketRef.current) {
      throw new Error("No active chat socket — is roomId set?");
    }
    socketRef.current.send(content);
  };

  return { status: socketStatus, messages: messages ?? [], send };
}
