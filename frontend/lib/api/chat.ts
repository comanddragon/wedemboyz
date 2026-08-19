import { apiClient, unwrap } from "./client";
import type { ChatMessage, ChatRoom, CreateChatRoomInput, Paginated, SendMessageInput } from "@/types";

/** GET /chat/rooms/ */
export async function listChatRooms(): Promise<ChatRoom[]> {
  const res = await apiClient.get("/chat/rooms/");
    const data = unwrap<Paginated<ChatRoom>>(res);
    return data.results;
}

/** POST /chat/rooms/ */
export async function createChatRoom(input: CreateChatRoomInput = {}): Promise<ChatRoom> {
  const res = await apiClient.post("/chat/rooms/", input);
  return unwrap<ChatRoom>(res);
}

/** GET /chat/rooms/{id}/ */
export async function getChatRoom(roomId: number): Promise<ChatRoom> {
  const res = await apiClient.get(`/chat/rooms/${roomId}/`);
  return unwrap<ChatRoom>(res);
}

/** POST /chat/rooms/{id}/close/ — agent/staff only. */
export async function closeChatRoom(roomId: number): Promise<ChatRoom> {
  const res = await apiClient.post(`/chat/rooms/${roomId}/close/`);
  return unwrap<ChatRoom>(res);
}

/**
 * GET /chat/rooms/{room_id}/messages/ — REST history/backfill. Live delivery
 * goes over the websocket (see lib/ws/chatSocket.ts); use this to load
 * history when a room is first opened, or to paginate further back.
 */
export async function listMessages(roomId: number, page = 1): Promise<Paginated<ChatMessage>> {
  const res = await apiClient.get(`/chat/rooms/${roomId}/messages/`, { params: { page } });
  return unwrap<Paginated<ChatMessage>>(res);
}

/** POST /chat/rooms/{room_id}/messages/ — REST fallback for sending a
 * message if the websocket connection is down. Also the only path for
 * attachments (multipart/form-data with an `attachments` file per item) —
 * the websocket protocol doesn't carry files. */
export async function sendMessage(roomId: number, input: SendMessageInput): Promise<ChatMessage> {
  if (input.attachments && input.attachments.length > 0) {
    const formData = new FormData();
    if (input.content) formData.append("content", input.content);
    for (const file of input.attachments) formData.append("attachments", file);
    const res = await apiClient.post(`/chat/rooms/${roomId}/messages/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap<ChatMessage>(res);
  }

  const res = await apiClient.post(`/chat/rooms/${roomId}/messages/`, { content: input.content ?? "" });
  return unwrap<ChatMessage>(res);
}

/** POST /chat/rooms/{room_id}/read/ — marks all messages in the room as read. */
export async function markRoomRead(roomId: number): Promise<void> {
  await apiClient.post(`/chat/rooms/${roomId}/read/`);
}
