import { apiClient } from "../client";

export interface Policy {
  _id: string;
  policyNumber: string;
  status: string;
  farmId: string | { _id: string };
  assessmentId?: string | { _id: string };
  startDate?: string;
  endDate?: string;
  issuedAt?: string;
  [key: string]: unknown;
}

export const policiesService = {
  listMyPolicies: async (): Promise<Policy[]> => {
    return apiClient.get<Policy[]>("/policies");
  },
};

