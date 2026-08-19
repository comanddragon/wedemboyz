/**
 * Central query-key factory (per frontend-flows.md §11) — keeps cache keys
 * consistent so invalidation after a mutation always targets the right
 * queries. Import this instead of hand-writing key arrays in components.
 */
export const queryKeys = {
  profile: {
    me: ["profile", "me"] as const,
    preferences: ["profile", "preferences"] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (page: number) => ["orders", "list", page] as const,
    detail: (id: number) => ["orders", id] as const,
  },
  schedule: {
    detail: (orderId: number) => ["schedule", orderId] as const,
  },
  payments: {
    methods: ["payments", "methods"] as const,
    list: (page: number) => ["payments", "list", page] as const,
    detail: (id: number) => ["payments", id] as const,
    invoices: (page: number) => ["invoices", "list", page] as const,
    invoice: (id: number) => ["invoices", id] as const,
    refunds: (page: number) => ["refunds", "list", page] as const,
    subscriptions: ["subscriptions"] as const,
    subscription: (id: number) => ["subscriptions", id] as const,
  },
  discounts: {
    validate: (code: string, orderTotal: number) => ["discounts", "validate", code, orderTotal] as const,
    loyalty: ["loyalty"] as const,
    loyaltyTransactions: (page: number) => ["loyalty", "transactions", page] as const,
    campaigns: {
      list: (page = 1) => ["discounts", "campaigns", "list", page] as const,
      detail: (id: number) => ["discounts", "campaigns", id] as const,
    },
    promoCodes: {
      list: (page = 1) => ["discounts", "promo-codes", "list", page] as const,
      detail: (id: number) => ["discounts", "promo-codes", id] as const,
    },
  },
  chat: {
    rooms: ["chat", "rooms"] as const,
    room: (id: number) => ["chat", "rooms", id] as const,
    messages: (roomId: number, page: number) => ["chat", "rooms", roomId, "messages", page] as const,
  },
  notifications: {
    list: (page: number) => ["notifications", "list", page] as const,
    preferences: ["notifications", "preferences"] as const,
  },
  customers: {
    list: (params: { page?: number; search?: string; ordering?: string } = {}) =>
      ["customers", "list", params] as const,
    detail: (id: number) => ["customers", id] as const,
  },
  staff: {
    roster: ["staff", "roster"] as const,
    detail: (id: number) => ["staff", id] as const,
    activity: (id: number) => ["staff", id, "activity"] as const,
    invites: ["staff", "invites"] as const,
  },
  finance: {
    expenses: {
      list: (params: { page?: number; category?: string; start?: string; end?: string } = {}) =>
        ["finance", "expenses", "list", params] as const,
      detail: (id: number) => ["finance", "expenses", id] as const,
    },
    analytics: {
      revenue: (params: { period?: string; start?: string; end?: string } = {}) =>
        ["finance", "analytics", "revenue", params] as const,
      summary: (params: { start?: string; end?: string } = {}) =>
        ["finance", "analytics", "summary", params] as const,
    },
    creditAccounts: {
      list: (
        params: { page?: number; search?: string; ordering?: string; outstanding_only?: boolean } = {}
      ) => ["finance", "credit-accounts", "list", params] as const,
      detail: (userId: number) => ["finance", "credit-accounts", userId] as const,
      transactions: (userId: number) => ["finance", "credit-accounts", userId, "transactions"] as const,
    },
  },
  inventory: {
    items: {
      list: (params: { page?: number; category?: string; search?: string } = {}) =>
        ["inventory", "items", "list", params] as const,
      detail: (id: number) => ["inventory", "items", id] as const,
      lowStock: ["inventory", "items", "low-stock"] as const,
      transactions: (id: number) => ["inventory", "items", id, "transactions"] as const,
    },
  },
};
