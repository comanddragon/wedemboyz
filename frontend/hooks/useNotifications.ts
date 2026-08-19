"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { notificationsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useNotificationStore } from "@/lib/stores/notification.store";

export function useNotifications(page = 1) {
    const queryClient = useQueryClient();
    const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
    const unreadCount = useNotificationStore((state) => state.unreadCount);

    const listQuery = useQuery({
        queryKey: queryKeys.notifications.list(page),
        queryFn: () => notificationsApi.listNotifications(page),
    });

    useEffect(() => {
        if (listQuery.data) {
            const unread = listQuery.data.results.filter((n) => !n.is_read).length;
            setUnreadCount(unread);
        }
    }, [listQuery.data, setUnreadCount]);

    const markReadMutation = useMutation({
        mutationFn: (id: number) => notificationsApi.markNotificationRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => notificationsApi.markAllNotificationsRead(),
        onSuccess: () => {
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
