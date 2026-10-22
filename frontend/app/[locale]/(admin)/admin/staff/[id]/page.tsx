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
import { useI18n } from "@/src/i18n/I18nProvider";
import type {
  EmploymentStatus,
  StaffRole,
  UpdateStaffProfileInput,
} from "@/src/types";

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
  const { locale, t } = useI18n();
  const [saveError, setSaveError] = useState<string | null>(null);

  const roleLabels: Record<StaffRole, string> = {
    MANAGER: t("adminCommon.roles.manager"),
    ATTENDANT: t("adminCommon.roles.attendant"),
    CASHIER: t("adminCommon.roles.cashier"),
    DRIVER: t("adminOrders.driver"),
  };

  const employmentLabels: Record<EmploymentStatus, string> = {
    ACTIVE: t("adminStaff.employmentStatuses.ACTIVE"),
    ON_LEAVE: t("adminStaff.employmentStatuses.ON_LEAVE"),
    SUSPENDED: t("adminStaff.employmentStatuses.SUSPENDED"),
    TERMINATED: t("adminStaff.employmentStatuses.TERMINATED"),
  };

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
        {t("common.loading")}
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
          {t("adminStaff.backToStaff")}
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
        {t("adminStaff.backToStaff")}
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {fullName}
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("adminStaff.joinedOn").replace(
              "{date}",
              new Date(staff.joined_at).toLocaleDateString(
                locale === "fr" ? "fr-FR" : "en-US",
              ),
            )}
          </p>
        </div>
        <StatusBadge
          label={roleLabels[staff.role]}
          tone={staffRoleTone(staff.role)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            {t("adminStaff.contact")}
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
            {invitedByName && (
              <p>
                {t("adminStaff.invitedBy").replace("{name}", invitedByName)}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            {t("adminStaff.access")}
          </h2>
          <div className="space-y-4">
            <div>
              <label
                className="mb-1 block text-xs font-medium text-ink-muted"
                htmlFor="staff-role"
              >
                {t("adminStaff.role")}
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
                    {roleLabels[role]}
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
              {t("adminStaff.activeLabel")}
            </label>

            {saveError && (
              <p className="text-sm text-status-cancelled-text">{saveError}</p>
            )}
            <p className="text-xs text-ink-muted">
              {t("adminStaff.accessHint")}
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            {t("adminStaff.operations")}
          </h2>
          <div className="space-y-3">
            <div>
              <label
                className="mb-1 block text-xs font-medium text-ink-muted"
                htmlFor="employment-status"
              >
                {t("adminStaff.employmentStatus")}
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
                    {employmentLabels[value]}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl bg-mist px-3 py-2.5 text-sm text-ink">
              <span>
                <span className="block font-medium">
                  {t("adminStaff.availableForChat")}
                </span>
                <span className="block text-xs text-ink-muted">
                  {staff.open_chat_count === 1
                    ? t("adminStaff.openAssignments").replace("{count}", "1")
                    : t("adminStaff.openAssignmentsPlural").replace(
                        "{count}",
                        String(staff.open_chat_count),
                      )}
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
              {t("adminStaff.lastLogin")}{" "}
              {staff.user.last_login
                ? new Date(staff.user.last_login).toLocaleString(
                    locale === "fr" ? "fr-FR" : "en-US",
                  )
                : t("adminStaff.never")}
            </p>
          </div>
        </Card>
      </div>

      <Card className="mt-3">
        <h2 className="font-display mb-3 text-sm font-medium text-ink">
          {t("adminStaff.employmentDetails")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-ink-muted">
            {t("adminStaff.hireDate")}
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
            {t("adminStaff.baseSalary")}
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
            {t("adminStaff.address")}
            <input
              className="ui-control mt-1"
              defaultValue={staff.address}
              onBlur={(event) =>
                updateMutation.mutate({ address: event.target.value })
              }
            />
          </label>
          <label className="text-xs font-medium text-ink-muted">
            {t("adminStaff.emergencyContact")}
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
            {t("adminStaff.emergencyPhone")}
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
            {t("adminStaff.internalNotes")}
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
        {t("adminStaff.activity")}
      </h2>
      <TableContainer>
        <THead>
          <Th>{t("adminStaff.colAction")}</Th>
          <Th>{t("adminStaff.colDetails")}</Th>
          <Th align="right">{t("adminStaff.colWhen")}</Th>
        </THead>
        <TBody>
          {activityLoading && <TableSkeleton columns={3} />}
          {!activityLoading && activity && activity.results.length === 0 && (
            <TableEmptyRow colSpan={3}>
              {t("adminStaff.noActivity")}
            </TableEmptyRow>
          )}
          {!activityLoading &&
            activity?.results.map((entry) => (
              <Tr key={entry.id}>
                <Td className="font-medium">{entry.action}</Td>
                <Td className="text-ink-muted">
                  {entry.description || <span>—</span>}
                </Td>
                <Td align="right" className="whitespace-nowrap text-ink-muted">
                  {new Date(entry.created_at).toLocaleString(
                    locale === "fr" ? "fr-FR" : "en-US",
                  )}
                </Td>
              </Tr>
            ))}
        </TBody>
      </TableContainer>
    </main>
  );
}
