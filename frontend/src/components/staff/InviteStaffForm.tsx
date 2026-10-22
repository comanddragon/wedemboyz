"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useI18n } from "@/src/i18n/I18nProvider";

import { Button, Field, Input, Select } from "@/src/components/ui";
import { staffApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import type { StaffRole } from "@/src/types";

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "ATTENDANT", label: "Attendant" },
  { value: "MANAGER", label: "Manager" },
  { value: "CASHIER", label: "Cashier" },
  { value: "DRIVER", label: "Driver" },
];

export function InviteStaffForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<StaffRole>("ATTENDANT");

  const roleOptions: { value: StaffRole; label: string }[] = [
    { value: "ATTENDANT", label: t("adminCommon.roles.attendant") },
    { value: "MANAGER", label: t("adminCommon.roles.manager") },
    { value: "CASHIER", label: t("adminCommon.roles.cashier") },
    { value: "DRIVER", label: t("adminOrders.driver") },
  ];

  const inviteMutation = useMutation({
    mutationFn: () =>
      staffApi.createStaffInvite({
        phone_number: phone.trim(),
        full_name: fullName.trim() || undefined,
        role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.invites });
      setPhone("");
      setFullName("");
      setRole("ATTENDANT");
      onDone();
    },
  });

  const isValid = phone.trim() !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) inviteMutation.mutate();
      }}
      className="rounded-card border border-crease bg-steam/40 p-4"
    >
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <Field label={t("adminStaff.phoneNumber")} htmlFor="invite-phone">
          <Input
            id="invite-phone"
            type="tel"
            placeholder="+237 6XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field label={t("adminStaff.fullName")} htmlFor="invite-name">
          <Input
            id="invite-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Paul Eto'o"
          />
        </Field>
        <Field label={t("adminStaff.role")} htmlFor="invite-role">
          <Select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {inviteMutation.isError && (
        <p className="mb-3 text-sm text-status-cancelled-text">
          {getApiErrorMessage(inviteMutation.error)}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid || inviteMutation.isPending}
        >
          {inviteMutation.isPending ? t("adminStaff.sending") : t("adminStaff.sendInvite")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("adminCommon.cancel")}
        </Button>
      </div>
    </form>
  );
}
