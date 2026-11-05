"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { notificationsApi } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query-keys";
import { useNotificationStore } from "@/src/lib/stores/notification.store";

export function useNotifications(page = 1, unreadOnly = false) {
  const queryClient = useQueryClient();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const listQuery = useQuery({
    queryKey: [...queryKeys.notifications.list(page), { unreadOnly }],
    queryFn: () => notificationsApi.listNotifications(page, unreadOnly ? false : undefined),
    refetchInterval: 30_000,
  });

  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: () => notificationsApi.listNotifications(1, false),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (unreadQuery.data) {
      setUnreadCount(unreadQuery.data.count);
    }
  }, [unreadQuery.data, setUnreadCount]);

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markNotificationRead(id),
    onSuccess: () => {
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
    error: listQuery.error,
    refetch: listQuery.refetch,
    isFetching: listQuery.isFetching,
    mutationError: markReadMutation.error || markAllReadMutation.error,
    isMarkingRead: markReadMutation.isPending || markAllReadMutation.isPending,
    unreadCount,
    hasNextPage: Boolean(listQuery.data?.next),
    hasPreviousPage: Boolean(listQuery.data?.previous),
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  };
}
