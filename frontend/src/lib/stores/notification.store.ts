import { create } from "zustand";

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrement: (by?: number) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  decrement: (by = 1) => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - by) })),
  reset: () => set({ unreadCount: 0 }),
}));
