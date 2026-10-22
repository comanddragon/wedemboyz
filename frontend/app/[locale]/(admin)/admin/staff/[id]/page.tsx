"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, User } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useParams } from "next/navigation";
import { useState } from "react";

import {
  TableContainer,
  TableEmptyRow,
  TableSkeleton,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/src/components/admin/Table";
import { Card, Select, StatusBadge, staffRoleTone } from "@/src/components/ui";
import { staffApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import type {
  EmploymentStatus,
  StaffRole,
  UpdateStaffProfileInput,
} from "@/src/types";

const ROLE_LABELS: Record<StaffRole, string> = {
  MANAGER: "Manager",
  ATTENDANT: "Attendant",
  CASHIER: "Cashier",
  DRIVER: "Driver",
};

const ROLE_OPTIONS: StaffRole[] = ["ATTENDANT", "CASHIER", "DRIVER", "MANAGER"];
const EMPLOYMENT_OPTIONS: EmploymentStatus[] = [
  "ACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
  "TERMINATED",
];

export default function AdminStaffDetailPage() {
  const params = useParams<{ id: string }>();
  const staffProfileId = Number(params.id);
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    data: staff,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.staff.detail(staffProfileId),
    queryFn: () => staffApi.getStaffProfile(staffProfileId),
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: queryKeys.staff.activity(staffProfileId),
    queryFn: () => staffApi.listStaffActivity(staffProfileId),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateStaffProfileInput) =>
      staffApi.updateStaffProfile(staffProfileId, input),
    onSuccess: (updated) => {
      setSaveError(null);
      queryClient.setQueryData(queryKeys.staff.detail(staffProfileId), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.roster });
    },
    onError: (err) => setSaveError(getApiErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        Loading...
      </main>
    );
  }

  if (error || !staff) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <Link
          href="/admin/staff"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to staff
        </Link>
        <p className="text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      </main>
    );
  }

  const fullName =
    `${staff.user.first_name} ${staff.user.last_name}`.trim() ||
    staff.user.phone_number;
  const invitedByName = staff.invited_by
    ? `${staff.invited_by.first_name} ${staff.invited_by.last_name}`.trim() ||
      staff.invited_by.phone_number
    : null;

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/staff"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to staff
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {fullName}
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            Joined {new Date(staff.joined_at).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge
          label={ROLE_LABELS[staff.role]}
          tone={staffRoleTone(staff.role)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            Contact
          </h2>
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
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            Access
          </h2>
          <div className="space-y-4">
            <div>
              <label
                className="mb-1 block text-xs font-medium text-ink-muted"
                htmlFor="staff-role"
              >
                Role
              </label>
              <Select
                id="staff-role"
                value={staff.role}
                disabled={updateMutation.isPending}
                onChange={(e) =>
                  updateMutation.mutate({ role: e.target.value as StaffRole })
                }
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
                onChange={(e) =>
                  updateMutation.mutate({ is_active: e.target.checked })
                }
              />
              Active — can sign in to the admin
            </label>

            {saveError && (
              <p className="text-sm text-status-cancelled-text">{saveError}</p>
            )}
            <p className="text-xs text-ink-muted">
              Role and access changes require owner or manager permissions and
              take effect immediately.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            Operations
          </h2>
          <div className="space-y-3">
            <div>
              <label
                className="mb-1 block text-xs font-medium text-ink-muted"
                htmlFor="employment-status"
              >
                Employment status
              </label>
              <Select
                id="employment-status"
                value={staff.employment_status}
                disabled={updateMutation.isPending}
                onChange={(event) =>
                  updateMutation.mutate({
                    employment_status: event.target.value as EmploymentStatus,
                  })
                }
              >
                {EMPLOYMENT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl bg-mist px-3 py-2.5 text-sm text-ink">
              <span>
                <span className="block font-medium">Available for chat</span>
                <span className="block text-xs text-ink-muted">
                  {staff.open_chat_count} open assignment
                  {staff.open_chat_count === 1 ? "" : "s"}
                </span>
              </span>
              <input
                type="checkbox"
                checked={staff.is_available_for_chat}
                disabled={updateMutation.isPending}
                onChange={(event) =>
                  updateMutation.mutate({
                    is_available_for_chat: event.target.checked,
                  })
                }
              />
            </label>
            <p className="text-xs text-ink-muted">
              Last login:{" "}
              {staff.user.last_login
                ? new Date(staff.user.last_login).toLocaleString()
                : "Never"}
            </p>
          </div>
        </Card>
      </div>

      <Card className="mt-3">
        <h2 className="font-display mb-3 text-sm font-medium text-ink">
          Employment details
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-ink-muted">
            Hire date
            <input
              type="date"
              className="ui-control mt-1"
              defaultValue={staff.hire_date ?? ""}
              onBlur={(event) =>
                updateMutation.mutate({ hire_date: event.target.value || null })
              }
            />
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Base salary (XAF)
            <input
              type="number"
              min="0"
              className="ui-control mt-1"
              defaultValue={staff.base_salary ?? ""}
              onBlur={(event) =>
                updateMutation.mutate({
                  base_salary: event.target.value || null,
                })
              }
            />
          </label>
          <label className="text-xs font-medium text-ink-muted sm:col-span-2">
            Address
            <input
              className="ui-control mt-1"
              defaultValue={staff.address}
              onBlur={(event) =>
                updateMutation.mutate({ address: event.target.value })
              }
            />
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Emergency contact
            <input
              className="ui-control mt-1"
              defaultValue={staff.emergency_contact_name}
              onBlur={(event) =>
                updateMutation.mutate({
                  emergency_contact_name: event.target.value,
                })
              }
            />
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Emergency phone
            <input
              type="tel"
              className="ui-control mt-1"
              defaultValue={staff.emergency_contact_phone}
              onBlur={(event) =>
                updateMutation.mutate({
                  emergency_contact_phone: event.target.value,
                })
              }
            />
          </label>
          <label className="text-xs font-medium text-ink-muted sm:col-span-2">
            Internal notes
            <textarea
              className="ui-control mt-1 min-h-20"
              defaultValue={staff.notes}
              onBlur={(event) =>
                updateMutation.mutate({ notes: event.target.value })
              }
            />
          </label>
        </div>
      </Card>

      <h2 className="font-display mb-3 mt-8 text-sm font-medium text-ink">
        Activity
      </h2>
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
                <Td className="text-ink-muted">
                  {entry.description || <span>—</span>}
                </Td>
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
