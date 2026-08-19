"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, Input, Select } from "@/components/ui";
import { staffApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { StaffRole } from "@/types";

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "ATTENDANT", label: "Attendant" },
  { value: "MANAGER", label: "Manager" },
  { value: "OWNER", label: "Owner" },
];

export function InviteStaffForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<StaffRole>("ATTENDANT");

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
        <Field label="Phone number" htmlFor="invite-phone">
          <Input
            id="invite-phone"
            type="tel"
            placeholder="+237 6XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field label="Full name (optional)" htmlFor="invite-name">
          <Input id="invite-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Paul Eto'o" />
        </Field>
        <Field label="Role" htmlFor="invite-role">
          <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {inviteMutation.isError && (
        <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(inviteMutation.error)}</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={!isValid || inviteMutation.isPending}>
          {inviteMutation.isPending ? "Sending…" : "Send invite"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
