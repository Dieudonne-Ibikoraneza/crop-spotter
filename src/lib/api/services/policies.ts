import { apiClient } from "../client";

export interface Policy {
  _id: string;
  policyNumber: string;
  status: string;
  farmId: string | { _id: string; name?: string };
  farmerId?: string | { _id: string; firstName?: string; lastName?: string };
  assessmentId?: string | { _id: string };
  startDate?: string;
  endDate?: string;
  premiumAmount?: number;
  coverageLevel?: string;
  issuedAt?: string;
  [key: string]: unknown;
}

export interface CreatePolicyRequest {
  assessmentId: string;
  coverageLevel?: string;
  startDate: string;
  endDate: string;
}

export const policiesService = {
  listMyPolicies: async (): Promise<Policy[]> => {
    return apiClient.get<Policy[]>("/policies");
  },

  issuePolicy: async (data: CreatePolicyRequest): Promise<Policy> => {
    return apiClient.post<Policy>("/policies", data);
  },
};

