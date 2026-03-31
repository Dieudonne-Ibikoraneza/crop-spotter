// Query Keys for React Query
// Centralized list of all query keys used in the application

// Auth Query Keys
export const authKeys = {
  me: ["auth", "me"] as const,
  login: () => ["auth", "login"] as const,
} as const;

// Users Query Keys
export const usersKeys = {
  all: ["users"] as const,
  lists: () => ["users", "list"] as const,
  list: (params?: Record<string, unknown>) =>
    ["users", "list", params] as const,
  details: () => ["users", "detail"] as const,
  detail: (id: string) => ["users", "detail", id] as const,
  profile: () => ["users", "profile"] as const,
} as const;

// Farms Query Keys
export const farmsKeys = {
  all: ["farms"] as const,
  lists: () => ["farms", "list"] as const,
  list: (params?: Record<string, unknown>) =>
    ["farms", "list", params] as const,
  details: () => ["farms", "detail"] as const,
  detail: (id: string) => ["farms", "detail", id] as const,
  insuranceRequests: () => ["farms", "insurance-requests"] as const,
} as const;

// Assessments Query Keys
export const assessmentsKeys = {
  all: ["assessments"] as const,
  lists: () => ["assessments", "list"] as const,
  list: (params?: Record<string, unknown>) =>
    ["assessments", "list", params] as const,
  details: () => ["assessments", "detail"] as const,
  detail: (id: string) => ["assessments", "detail", id] as const,
  // Assessor specific
  assignedFarmers: ["assessments", "farmers", "list"] as const,
} as const;

// Policies Query Keys
export const policiesKeys = {
  all: ["policies"] as const,
  lists: () => ["policies", "list"] as const,
  list: (params?: Record<string, unknown>) =>
    ["policies", "list", params] as const,
  details: () => ["policies", "detail"] as const,
  detail: (id: string) => ["policies", "detail", id] as const,
} as const;

// Claims Query Keys
export const claimsKeys = {
  all: ["claims"] as const,
  lists: () => ["claims", "list"] as const,
  list: (params?: Record<string, unknown>) =>
    ["claims", "list", params] as const,
  details: () => ["claims", "detail"] as const,
  detail: (id: string) => ["claims", "detail", id] as const,
} as const;

// Monitoring Query Keys
export const monitoringKeys = {
  farms: (farmId: string) => ["monitoring", "farm", farmId] as const,
  alerts: ["monitoring", "alerts"] as const,
  farmAlerts: (farmId: string) =>
    ["monitoring", "farm", farmId, "alerts"] as const,
} as const;

// Admin Query Keys
export const adminKeys = {
  statistics: ["admin", "statistics"] as const,
  policiesOverview: ["admin", "policies", "overview"] as const,
  claimsStatistics: ["admin", "claims", "statistics"] as const,
} as const;

// Farmer Query Keys
export const farmerKeys = {
  stats: ["farmer", "stats"] as const,
  farms: ["farmer", "farms"] as const,
  farmDetail: (id: string) => ["farmer", "farms", "detail", id] as const,
  policies: ["farmer", "policies"] as const,
  claims: ["farmer", "claims"] as const,
  alerts: ["monitoring", "alerts"] as const,
  farmAlerts: (farmId: string) => ["monitoring", "farm", farmId, "alerts"] as const,
  insuranceRequests: ["farmer", "insurance-requests"] as const,
} as const;

// Combined query keys export
export const queryKeys = {
  auth: authKeys,
  users: usersKeys,
  farms: farmsKeys,
  assessments: assessmentsKeys,
  policies: policiesKeys,
  claims: claimsKeys,
  monitoring: monitoringKeys,
  admin: adminKeys,
} as const;

export type QueryKey = typeof queryKeys;
