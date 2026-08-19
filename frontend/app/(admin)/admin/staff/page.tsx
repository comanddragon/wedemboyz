"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SearchInput } from "@/components/admin/SearchInput";
import {
  SortableTh,
  TableContainer,
  TableEmptyRow,
  TableSkeleton,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/admin/Table";
import { useSort } from "@/components/admin/useSort";
import { InviteStaffForm } from "@/components/staff/InviteStaffForm";
import { Button, Select, StatusBadge, staffInviteStatusTone, staffRoleTone } from "@/components/ui";
import { staffApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { StaffInvite, StaffProfile, StaffRole } from "@/types";

const ROLE_LABELS: Record<StaffRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  ATTENDANT: "Attendant",
};

const ROLE_FILTER_OPTIONS: { value: StaffRole | "ALL"; label: string }[] = [
  { value: "ALL", label: "All roles" },
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "ATTENDANT", label: "Attendant" },
];

type RosterSortKey = "name" | "phone_number" | "role" | "joined_at";
type InviteSortKey = "full_name" | "phone_number" | "role" | "status" | "created_at";

function staffFullName(user: StaffProfile["user"]): string {
  return `${user.first_name} ${user.last_name}`.trim() || user.phone_number;
}

export default function AdminStaffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"roster" | "invites">("roster");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<StaffRole | "ALL">("ALL");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: roster, isLoading: rosterLoading, error: rosterError } = useQuery({
    queryKey: queryKeys.staff.roster,
    queryFn: () => staffApi.listStaff(),
  });

  const { data: invites, isLoading: invitesLoading, error: invitesError } = useQuery({
    queryKey: queryKeys.staff.invites,
    queryFn: () => staffApi.listStaffInvites(),
    enabled: tab === "invites",
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: number) => staffApi.revokeStaffInvite(inviteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.invites }),
  });

  const filteredRoster = useMemo(() => {
    if (!roster) return undefined;
    const term = search.trim().toLowerCase();
    return roster.results.filter((s) => {
      const matchesSearch =
        term === "" || staffFullName(s.user).toLowerCase().includes(term) || s.user.phone_number.includes(term);
      const matchesRole = roleFilter === "ALL" || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [roster, search, roleFilter]);

  const { sorted: sortedRoster, toggle: toggleRoster, directionFor: rosterDirectionFor } = useSort<
    StaffProfile,
    RosterSortKey
  >(filteredRoster, (row, key) => {
    switch (key) {
      case "name":
        return staffFullName(row.user).toLowerCase();
      case "phone_number":
        return row.user.phone_number;
      case "role":
        return row.role;
      case "joined_at":
        return row.joined_at;
    }
  });

  const { sorted: sortedInvites, toggle: toggleInvites, directionFor: invitesDirectionFor } = useSort<
    StaffInvite,
    InviteSortKey
  >(invites?.results, (row, key) => {
    switch (key) {
      case "full_name":
        return row.full_name.toLowerCase();
      case "phone_number":
        return row.phone_number;
      case "role":
        return row.role;
      case "status":
        return row.status;
      case "created_at":
        return row.created_at;
    }
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <AdminPageHeader
        title="Staff"
        description="Manage who has admin access and their roles."
        action={
          <Button variant="secondary" onClick={() => setShowInviteForm((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Invite staff
          </Button>
        }
      />

      <div className="mb-6 inline-flex rounded-md border border-crease bg-white p-0.5">
        {(["roster", "invites"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              tab === t ? "bg-navy text-white" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t === "roster" ? "Roster" : "Pending invites"}
          </button>
        ))}
      </div>

      {showInviteForm && (
        <div className="mb-6">
          <InviteStaffForm onDone={() => setShowInviteForm(false)} />
        </div>
      )}

      {tab === "roster" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              placeholder="Search by name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
              aria-label="Search staff"
            />
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as StaffRole | "ALL")}
              className="sm:w-44"
              aria-label="Filter by role"
            >
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            {roster && (
              <p className="text-xs text-ink-muted sm:ml-auto">
                {filteredRoster?.length ?? 0} of {roster.results.length} staff
              </p>
            )}
          </div>

          {rosterError && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(rosterError)}</p>}

          <TableContainer>
            <THead>
              <SortableTh
                label="Name"
                active={rosterDirectionFor("name") !== null}
                direction={rosterDirectionFor("name")}
                onSort={() => toggleRoster("name")}
              />
              <SortableTh
                label="Phone"
                active={rosterDirectionFor("phone_number") !== null}
                direction={rosterDirectionFor("phone_number")}
                onSort={() => toggleRoster("phone_number")}
              />
              <SortableTh
                label="Role"
                active={rosterDirectionFor("role") !== null}
                direction={rosterDirectionFor("role")}
                onSort={() => toggleRoster("role")}
              />
              <Th>Status</Th>
              <SortableTh
                label="Joined"
                active={rosterDirectionFor("joined_at") !== null}
                direction={rosterDirectionFor("joined_at")}
                onSort={() => toggleRoster("joined_at")}
              />
              <Th className="w-8" />
            </THead>
            <TBody>
              {rosterLoading && <TableSkeleton columns={6} />}
              {!rosterLoading && sortedRoster && sortedRoster.length === 0 && (
                <TableEmptyRow colSpan={6}>
                  {roster && roster.results.length === 0 ? "No staff yet." : "No staff match your search or filter."}
                </TableEmptyRow>
              )}
              {!rosterLoading &&
                sortedRoster?.map((staff) => (
                  <Tr key={staff.id} onClick={() => router.push(`/admin/staff/${staff.id}`)}>
                    <Td className="font-medium">{staffFullName(staff.user)}</Td>
                    <Td className="text-ink-muted">{staff.user.phone_number}</Td>
                    <Td>
                      <StatusBadge label={ROLE_LABELS[staff.role]} tone={staffRoleTone(staff.role)} />
                    </Td>
                    <Td>
                      {staff.is_active ? (
                        <StatusBadge label="Active" tone="ready" />
                      ) : (
                        <StatusBadge label="Inactive" tone="cancelled" />
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-ink-muted">
                      {new Date(staff.joined_at).toLocaleDateString()}
                    </Td>
                    <Td>
                      <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                    </Td>
                  </Tr>
                ))}
            </TBody>
          </TableContainer>
        </>
      )}

      {tab === "invites" && (
        <>
          {invitesError && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(invitesError)}</p>}

          <TableContainer>
            <THead>
              <SortableTh
                label="Name"
                active={invitesDirectionFor("full_name") !== null}
                direction={invitesDirectionFor("full_name")}
                onSort={() => toggleInvites("full_name")}
              />
              <SortableTh
                label="Phone"
                active={invitesDirectionFor("phone_number") !== null}
                direction={invitesDirectionFor("phone_number")}
                onSort={() => toggleInvites("phone_number")}
              />
              <SortableTh
                label="Role"
                active={invitesDirectionFor("role") !== null}
                direction={invitesDirectionFor("role")}
                onSort={() => toggleInvites("role")}
              />
              <SortableTh
                label="Status"
                active={invitesDirectionFor("status") !== null}
                direction={invitesDirectionFor("status")}
                onSort={() => toggleInvites("status")}
              />
              <SortableTh
                label="Sent"
                active={invitesDirectionFor("created_at") !== null}
                direction={invitesDirectionFor("created_at")}
                onSort={() => toggleInvites("created_at")}
              />
              <Th>Expires</Th>
              <Th className="w-20" />
            </THead>
            <TBody>
              {invitesLoading && <TableSkeleton columns={7} />}
              {!invitesLoading && sortedInvites && sortedInvites.length === 0 && (
                <TableEmptyRow colSpan={7}>No invites sent yet.</TableEmptyRow>
              )}
              {!invitesLoading &&
                sortedInvites?.map((invite) => (
                  <Tr key={invite.id}>
                    <Td className="font-medium">{invite.full_name || <span className="text-ink-muted">—</span>}</Td>
                    <Td className="text-ink-muted">{invite.phone_number}</Td>
                    <Td>
                      <StatusBadge label={ROLE_LABELS[invite.role]} tone={staffRoleTone(invite.role)} />
                    </Td>
                    <Td>
                      <StatusBadge label={invite.status} tone={staffInviteStatusTone(invite.status)} />
                    </Td>
                    <Td className="whitespace-nowrap text-ink-muted">
                      {new Date(invite.created_at).toLocaleDateString()}
                    </Td>
                    <Td className="whitespace-nowrap text-ink-muted">
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </Td>
                    <Td>
                      {invite.status === "PENDING" && (
                        <Button
                          variant="danger"
                          className="px-2.5 py-1 text-xs"
                          disabled={revokeMutation.isPending}
                          onClick={() => revokeMutation.mutate(invite.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
            </TBody>
          </TableContainer>
        </>
      )}
    </main>
  );
}
