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
  insurerAcknowledgedAt?: string;
  farmerAcknowledgedAt?: string;
  farmerRejectedAt?: string;
  farmerRejectionReason?: string;
  [key: string]: unknown;
}

export interface FarmerRejectPolicyRequest {
  reason: string;
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

  getPolicy: async (id: string): Promise<Policy> => {
    return apiClient.get<Policy>(`/policies/${id}`);
  },

  issuePolicy: async (data: CreatePolicyRequest): Promise<Policy> => {
    return apiClient.post<Policy>("/policies", data);
  },

  /** Farmer accepts a pending policy; backend sets status ACTIVE. */
  farmerAcknowledgePolicy: async (policyId: string): Promise<Policy> => {
    return apiClient.post<Policy>(`/policies/${policyId}/farmer-acknowledge`, {});
  },

  farmerRejectPolicy: async (
    policyId: string,
    data: FarmerRejectPolicyRequest,
  ): Promise<Policy> => {
    return apiClient.post<Policy>(`/policies/${policyId}/farmer-reject`, data);
  },
};

