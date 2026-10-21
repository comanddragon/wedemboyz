import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/lib/query-keys";
import type { ChatRoom } from "@/src/types";

export function clearRoomUnread(queryClient: QueryClient, roomId: number) {
  queryClient.setQueryData<ChatRoom[]>(queryKeys.chat.rooms, (rooms) =>
    rooms?.map((room) =>
      room.id === roomId ? { ...room, unread_count: 0 } : room,
    ),
  );
  queryClient.setQueryData<ChatRoom>(queryKeys.chat.room(roomId), (room) =>
    room ? { ...room, unread_count: 0 } : room,
  );
}
