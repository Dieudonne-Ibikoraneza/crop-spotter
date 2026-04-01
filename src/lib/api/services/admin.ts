import { apiClient } from "../client";
import type { Assessment } from "./assessor";

/** Farm awaiting KML / assessor assignment (GET /assessments/pending-farms) */
export interface PendingFarmRow {
  id: string;
  name?: string;
  cropType?: string;
  sowingDate?: string;
  createdAt: string;
  updatedAt?: string;
  farmer: {
    id: string;
    email?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    district?: string;
    province?: string;
    farmerProfile?: {
      farmProvince?: string;
      farmDistrict?: string;
      farmSector?: string;
      farmCell?: string;
      farmVillage?: string;
    };
  };
}

export interface AssignAssessorPayload {
  farmId: string;
  assessorId: string;
  /** Optional — links the assessment to an insurer */
  insurerId?: string;
}

/** GET /admin/health */
export interface AdminSystemHealth {
  checkedAt: string;
  overall: "healthy" | "degraded" | "unhealthy";
  database: {
    status: "ok" | "error";
    latencyMs?: number;
    detail?: string;
  };
  agromonitoring: {
    status: "ok" | "error";
    latencyMs?: number;
    detail?: string;
  };
  eosdaFields: {
    status: "ok" | "error";
    latencyMs?: number;
    fieldCount?: number;
    detail?: string;
  };
  storage: {
    status: "ok" | "error";
    uploadsPath: string;
    usedBytes?: number;
    usedLabel?: string;
    detail?: string;
  };
  process: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    externalMb: number;
  };
}

/** GET /admin/statistics */
export interface AdminSystemStatistics {
  overview: {
    totalUsers: number;
    totalFarms: number;
    totalPolicies: number;
    totalClaims: number;
    totalAssessments: number;
    activePolicies: number;
    /** Claims in FILED, ASSIGNED, or IN_PROGRESS */
    activeClaims: number;
  };
  usersByRole: Record<string, number>;
  policiesByStatus: Record<string, number>;
  claimsByStatus: Record<string, number>;
}

export const adminService = {
  getSystemStatistics: async (): Promise<AdminSystemStatistics> => {
    return apiClient.get<AdminSystemStatistics>("/admin/statistics");
  },

  getSystemHealth: async (): Promise<AdminSystemHealth> => {
    return apiClient.get<AdminSystemHealth>("/admin/health");
  },

  /** All policies with populated refs (Admin only) */
  getAllPoliciesList: async (): Promise<unknown[]> => {
    const data = await apiClient.get<unknown[]>("/admin/policies/list");
    return Array.isArray(data) ? data : [];
  },
  getPendingFarms: async (): Promise<PendingFarmRow[]> => {
    const data = await apiClient.get<PendingFarmRow[] | { data?: PendingFarmRow[] }>(
      "/assessments/pending-farms",
    );
    if (Array.isArray(data)) return data;
    const wrapped = data as { data?: PendingFarmRow[] };
    return Array.isArray(wrapped.data) ? wrapped.data : [];
  },

  assignAssessorToFarm: async (
    payload: AssignAssessorPayload,
  ): Promise<Assessment> => {
    const body: AssignAssessorPayload = {
      farmId: payload.farmId,
      assessorId: payload.assessorId,
    };
    if (payload.insurerId?.trim()) {
      body.insurerId = payload.insurerId.trim();
    }
    return apiClient.post<Assessment>("/assessments/assign", body);
  },
};
