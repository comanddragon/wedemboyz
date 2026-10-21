"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { notificationsApi } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query-keys";
import { useNotificationStore } from "@/src/lib/stores/notification.store";

export function useNotifications(page = 1) {
  const queryClient = useQueryClient();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const decrementUnreadCount = useNotificationStore((state) => state.decrement);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const listQuery = useQuery({
    queryKey: queryKeys.notifications.list(page),
    queryFn: () => notificationsApi.listNotifications(page),
  });

  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: () => notificationsApi.listNotifications(1, false),
  });

  useEffect(() => {
    if (unreadQuery.data) {
      setUnreadCount(unreadQuery.data.count);
    }
  }, [unreadQuery.data, setUnreadCount]);

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markNotificationRead(id),
    onSuccess: () => {
      decrementUnreadCount();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsRead(),
    onSuccess: () => {
      setUnreadCount(0);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications: listQuery.data?.results ?? [],
    isLoading: listQuery.isLoading,
    unreadCount,
    hasNextPage: Boolean(listQuery.data?.next),
    hasPreviousPage: Boolean(listQuery.data?.previous),
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  };
}
