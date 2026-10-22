export const ADMIN_PERMISSIONS = [
  "dashboard.view",
  "orders.view",
  "orders.manage",
  "sales.create",
  "payments.view",
  "chat.manage",
  "customers.view",
  "inventory.view",
  "inventory.manage",
  "discounts.manage",
  "finance.view",
  "finance.manage",
  "refunds.manage",
  "staff.manage",
  "payments.record",
  "inventory.log_usage",
  "orders.cancel",
  "orders.edit_items",
  "loyalty.manage",
  "reports.export",
  "schedule.manage",
  "suppliers.manage",
  "audit.view",
  "customers.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];
export type AdminRole =
  "OWNER" | "MANAGER" | "ATTENDANT" | "CASHIER" | "DRIVER";

export function canAccess(
  permissions: readonly string[] | undefined,
  permission: AdminPermission,
) {
  return permissions?.includes(permission) ?? false;
}

export function requiredPermissionForPath(pathname: string): AdminPermission {
  if (pathname.startsWith("/admin/audit")) return "audit.view";
  if (pathname.startsWith("/admin/settings")) return "finance.manage";
  if (pathname.startsWith("/admin/staff")) return "staff.manage";
  if (pathname.startsWith("/admin/payroll")) return "staff.manage";
  if (pathname.startsWith("/admin/expenses")) return "finance.manage";
  if (pathname.startsWith("/admin/cash-register")) return "finance.manage";
  if (pathname.startsWith("/admin/subscriptions")) return "finance.manage";
  if (pathname.startsWith("/admin/analytics")) return "finance.view";
  if (pathname.startsWith("/admin/finance")) return "finance.view";
  if (pathname.startsWith("/admin/discounts")) return "discounts.manage";
  if (pathname.startsWith("/admin/loyalty")) return "loyalty.manage";
  if (pathname.startsWith("/admin/ambassadors")) return "staff.manage";
  if (pathname.startsWith("/admin/inventory")) return "inventory.view";
  if (pathname.startsWith("/admin/customers")) return "customers.view";
  if (pathname.startsWith("/admin/chat")) return "chat.manage";
  if (pathname.startsWith("/admin/payments")) return "payments.view";
  if (pathname.startsWith("/admin/orders")) return "orders.view";
  if (pathname.startsWith("/admin/quick-sale")) return "sales.create";
  return "dashboard.view";
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  ATTENDANT: "Attendant",
  CASHIER: "Cashier",
  DRIVER: "Driver",
};
