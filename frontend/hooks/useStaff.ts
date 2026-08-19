"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { staffApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AcceptStaffInviteInput, CreateStaffInviteInput, UpdateStaffProfileInput } from "@/types";

/** GET /api/v1/staff/ — the roster, plus role/active-status updates. */
export function useStaff() {
  const queryClient = useQueryClient();

  const rosterQuery = useQuery({
    queryKey: queryKeys.staff.roster,
    queryFn: () => staffApi.listStaff(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ staffProfileId, input }: { staffProfileId: number; input: UpdateStaffProfileInput }) =>
      staffApi.updateStaffProfile(staffProfileId, input),
    onSuccess: (_, { staffProfileId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.roster });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.detail(staffProfileId) });
    },
  });

  return {
    roster: rosterQuery.data?.results ?? [],
    count: rosterQuery.data?.count ?? 0,
    isLoading: rosterQuery.isLoading,
    isError: rosterQuery.isError,
    error: rosterQuery.error,
    updateStaffProfile: updateMutation.mutate,
    updateStaffProfileAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
  };
}

/** GET /api/v1/staff/{id}/activity/ — per-staff activity log. */
export function useStaffActivity(staffProfileId: number | undefined) {
  const activityQuery = useQuery({
    queryKey: queryKeys.staff.activity(staffProfileId as number),
    queryFn: () => staffApi.listStaffActivity(staffProfileId as number),
    enabled: typeof staffProfileId === "number",
  });

  return {
    activity: activityQuery.data?.results ?? [],
    isLoading: activityQuery.isLoading,
    isError: activityQuery.isError,
  };
}

/** Invite management (list/create/revoke) — requires IsStaffManager
 * (superuser, or a StaffProfile with role=OWNER). */
export function useStaffInvites() {
  const queryClient = useQueryClient();

  const invitesQuery = useQuery({
    queryKey: queryKeys.staff.invites,
    queryFn: () => staffApi.listStaffInvites(),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateStaffInviteInput) => staffApi.createStaffInvite(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.invites });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: number) => staffApi.revokeStaffInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.invites });
    },
  });

  return {
    invites: invitesQuery.data?.results ?? [],
    isLoading: invitesQuery.isLoading,
    isError: invitesQuery.isError,
    createInvite: createMutation.mutate,
    createInviteAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    revokeInvite: revokeMutation.mutate,
    isRevoking: revokeMutation.isPending,
  };
}

/**
 * POST /api/v1/staff/invites/accept/ — public, AllowAny. Intended for a
 * standalone `/invite/accept` page reached by an unauthenticated invitee, so
 * this deliberately doesn't touch auth state or invalidate any queries.
 */
export function useAcceptStaffInvite() {
  const mutation = useMutation({
    mutationFn: (input: AcceptStaffInviteInput) => staffApi.acceptStaffInvite(input),
  });

  return {
    acceptInvite: mutation.mutate,
    acceptInviteAsync: mutation.mutateAsync,
    isAccepting: mutation.isPending,
    error: mutation.error,
    result: mutation.data,
  };
}
