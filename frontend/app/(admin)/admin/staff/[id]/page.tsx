"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { TableContainer, TableEmptyRow, TableSkeleton, TBody, Td, Th, THead, Tr } from "@/components/admin/Table";
import { Card, Select, StatusBadge, staffRoleTone } from "@/components/ui";
import { staffApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { StaffRole } from "@/types";

const ROLE_LABELS: Record<StaffRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  ATTENDANT: "Attendant",
};

const ROLE_OPTIONS: StaffRole[] = ["ATTENDANT", "MANAGER", "OWNER"];

export default function AdminStaffDetailPage() {
  const params = useParams<{ id: string }>();
  const staffProfileId = Number(params.id);
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: staff, isLoading, error } = useQuery({
    queryKey: queryKeys.staff.detail(staffProfileId),
    queryFn: () => staffApi.getStaffProfile(staffProfileId),
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: queryKeys.staff.activity(staffProfileId),
    queryFn: () => staffApi.listStaffActivity(staffProfileId),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { role?: StaffRole; is_active?: boolean }) =>
      staffApi.updateStaffProfile(staffProfileId, input),
    onSuccess: (updated) => {
      setSaveError(null);
      queryClient.setQueryData(queryKeys.staff.detail(staffProfileId), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.roster });
    },
    onError: (err) => setSaveError(getApiErrorMessage(err)),
  });

  if (isLoading) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-sm text-ink-muted">Loading...</main>;
  }

  if (error || !staff) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/admin/staff" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to staff
        </Link>
        <p className="text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>
      </main>
    );
  }

  const fullName = `${staff.user.first_name} ${staff.user.last_name}`.trim() || staff.user.phone_number;
  const invitedByName = staff.invited_by
    ? `${staff.invited_by.first_name} ${staff.invited_by.last_name}`.trim() || staff.invited_by.phone_number
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/staff" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to staff
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-navy">{fullName}</h1>
          <p className="mt-0.5 text-xs text-ink-muted">Joined {new Date(staff.joined_at).toLocaleDateString()}</p>
        </div>
        <StatusBadge label={ROLE_LABELS[staff.role]} tone={staffRoleTone(staff.role)} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">Contact</h2>
          <div className="space-y-2 text-sm text-ink-muted">
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {staff.user.phone_number}
            </p>
            {staff.user.email && (
              <p className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {staff.user.email}
              </p>
            )}
            {invitedByName && <p>Invited by {invitedByName}</p>}
          </div>
        </Card>

        <Card>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">Access</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="staff-role">
                Role
              </label>
              <Select
                id="staff-role"
                value={staff.role}
                disabled={updateMutation.isPending}
                onChange={(e) => updateMutation.mutate({ role: e.target.value as StaffRole })}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={staff.is_active}
                disabled={updateMutation.isPending}
                onChange={(e) => updateMutation.mutate({ is_active: e.target.checked })}
              />
              Active — can sign in to the admin
            </label>

            {saveError && <p className="text-sm text-status-cancelled-text">{saveError}</p>}
            <p className="text-xs text-ink-muted">
              Role and access changes require owner or manager permissions and take effect immediately.
            </p>
          </div>
        </Card>
      </div>

      <h2 className="font-display mb-3 mt-8 text-sm font-medium text-ink">Activity</h2>
      <TableContainer>
        <THead>
          <Th>Action</Th>
          <Th>Details</Th>
          <Th align="right">When</Th>
        </THead>
        <TBody>
          {activityLoading && <TableSkeleton columns={3} />}
          {!activityLoading && activity && activity.results.length === 0 && (
            <TableEmptyRow colSpan={3}>No activity recorded yet.</TableEmptyRow>
          )}
          {!activityLoading &&
            activity?.results.map((entry) => (
              <Tr key={entry.id}>
                <Td className="font-medium">{entry.action}</Td>
                <Td className="text-ink-muted">{entry.description || <span>—</span>}</Td>
                <Td align="right" className="whitespace-nowrap text-ink-muted">
                  {new Date(entry.created_at).toLocaleString()}
                </Td>
              </Tr>
            ))}
        </TBody>
      </TableContainer>
    </main>
  );
}
