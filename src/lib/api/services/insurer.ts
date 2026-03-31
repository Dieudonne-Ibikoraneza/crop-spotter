import { apiClient } from "../client";

export interface InsurerDashboardStats {
  stats: {
    openClaims: number;
    submittedToday: number;
    activePolicies: number;
    assessorsOnline: number;
  };
  priorityQueue: Array<{
    id: string;
    farm: string;
    event: string;
    status: string;
    createdAt: string;
  }>;
}

export interface InsurerReportsData {
  summary: {
    totalPremium: number;
    activePolicies: number;
    totalPolicies: number;
    totalClaims: number;
    approvedClaims: number;
    rejectedClaims: number;
    pendingClaims: number;
    lossRatio: number;
  };
  regionalDistribution: Array<{ name: string; value: number }>;
  monthlyTrends: Array<{ month: string; policies: number; claims: number }>;
}

export const insurerService = {
  getDashboardStats: async (): Promise<InsurerDashboardStats> => {
    return apiClient.get<InsurerDashboardStats>("/insurer/dashboard/stats");
  },

  getReports: async (): Promise<InsurerReportsData> => {
    return apiClient.get<InsurerReportsData>("/insurer/reports");
  },
};
