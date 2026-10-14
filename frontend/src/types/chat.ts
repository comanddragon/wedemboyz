export type ChatRoomStatus = "OPEN" | "CLOSED";

/** Mirrors apps.chat.api.serializers.room.MessageAttachmentSerializer */
export interface MessageAttachment {
  id: number;
  file: string;
  file_name: string;
  content_type: string;
  created_at: string;
}

/** Mirrors apps.chat.api.serializers.room.MessageSerializer */
export interface ChatMessage {
  id: number;
  room: number;
  sender: number;
  sender_name: string;
  content: string;
  attachments: MessageAttachment[];
  read_at: string | null;
  created_at: string;
}

/** Payload for POST /chat/rooms/{room_id}/messages/ — REST fallback; the
 * websocket at ws/chat/<room_id>/ is the primary live channel for text-only
 * messages. `attachments` (multipart upload) always goes through this REST
 * path since the websocket protocol doesn't carry files. */
export interface SendMessageInput {
  content?: string;
  attachments?: File[];
}

/** Mirrors apps.chat.api.serializers.room.ChatRoomSerializer */
export interface ChatRoom {
  id: number;
    customer: {
        id: number;
        first_name: string;
        last_name: string;
    };
  agent: number | null;
  order: {
      id: number;
  }
  status: ChatRoomStatus;
  last_message: ChatMessage | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

/** Payload for POST /chat/rooms/ — mirrors ChatRoomCreateSerializer. */
export interface CreateChatRoomInput {
  order?: number | null;
}

/**
 * Shape of messages sent/received over ws/chat/<room_id>/
 * (see apps.chat.consumers.ChatConsumer). Outbound only needs `content`;
 * everything else is what the server broadcasts back via `chat_message`.
 */
export interface WsOutboundMessage {
  content: string;
}

export interface WsInboundMessage {
  id: string;
  room_id: string;
  sender_id: number;
  content: string;
  created_at: string;
}
