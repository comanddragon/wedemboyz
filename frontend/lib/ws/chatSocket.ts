import { getAuthState } from "@/lib/stores/auth.store";
import type { WsInboundMessage, WsOutboundMessage } from "@/types";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000";

type ChatSocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

interface ChatSocketEvents {
  message: (message: WsInboundMessage) => void;
  status: (status: ChatSocketStatus) => void;
}

const MAX_RECONNECT_DELAY_MS = 15_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

/**
 * Thin wrapper around the raw WebSocket for a single chat room. One instance
 * per open room — create it when a chat view mounts, call .close() when it
 * unmounts.
 *
 * NOTE: apps.chat.routing currently wraps the consumer in Channels' stock
 * AuthMiddlewareStack, which authenticates via session cookie, not JWT. A
 * plain browser WebSocket can't attach an Authorization header, so this
 * client passes the access token as a `?token=` query param instead — but
 * that only authenticates anything once the backend has a matching
 * JWT-aware auth middleware in front of ChatConsumer. Until then, connections
 * will come through as AnonymousUser and get closed with code 4001.
 */
export class ChatSocket {
  private socket: WebSocket | null = null;
  private roomId: number;
  private listeners: { [K in keyof ChatSocketEvents]: Set<ChatSocketEvents[K]> } = {
    message: new Set(),
    status: new Set(),
  };
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;

  constructor(roomId: number) {
    this.roomId = roomId;
  }

  connect(): void {
    this.manuallyClosed = false;
    const { accessToken } = getAuthState();
    const url = `${WS_BASE_URL}/ws/chat/${this.roomId}/${accessToken ? `?token=${accessToken}` : ""}`;

    this.emit("status", "connecting");
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.emit("status", "open");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsInboundMessage;
        this.emit("message", data);
      } catch {
        // Ignore malformed frames rather than crashing the socket handler.
      }
    };

    socket.onerror = () => {
      this.emit("status", "error");
    };

    socket.onclose = () => {
      this.emit("status", "closed");
      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  send(content: string): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      throw new Error("Chat socket is not open.");
    }
    const payload: WsOutboundMessage = { content };
    this.socket.send(JSON.stringify(payload));
  }

  close(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
  }

  on<K extends keyof ChatSocketEvents>(event: K, handler: ChatSocketEvents[K]): () => void {
    this.listeners[event].add(handler);
    return () => this.listeners[event].delete(handler);
  }

  private emit<K extends keyof ChatSocketEvents>(event: K, ...args: Parameters<ChatSocketEvents[K]>): void {
    this.listeners[event].forEach((handler) => (handler as (...a: unknown[]) => void)(...args));
  }

  private scheduleReconnect(): void {
    const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempt, MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
