import { apiClient } from "../client";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status?: string;
  active: boolean;
  nationalId?: string;
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  sex?: string;
  createdAt: string;
}

export const usersService = {
  /** List all assessors (Insurer/Admin only) */
  getAssessors: async (): Promise<UserProfile[]> => {
    const response = await apiClient.get<any>("/users/assessors");
    // Handle paginated response format: { items: [...], totalItems: 10, ... }
    if (response && response.items && Array.isArray(response.items)) {
      return response.items;
    }
    return Array.isArray(response) ? response : response?.data || [];
  },
};
