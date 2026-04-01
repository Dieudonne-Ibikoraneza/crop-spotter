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

export interface PaginatedUsers<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

function mapUserDoc(u: Record<string, unknown>): UserProfile {
  const raw = u as {
    _id?: string;
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    role?: string;
    active?: boolean;
    nationalId?: string;
    province?: string;
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
    sex?: string;
    createdAt?: string;
  };
  const id = String(raw.id ?? raw._id ?? "");
  return {
    id,
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    email: raw.email ?? "",
    phoneNumber: raw.phoneNumber ?? "",
    role: raw.role ?? "",
    active: raw.active ?? true,
    nationalId: raw.nationalId,
    province: raw.province,
    district: raw.district,
    sector: raw.sector,
    cell: raw.cell,
    village: raw.village,
    sex: raw.sex,
    createdAt: raw.createdAt ?? "",
  };
}

export const usersService = {
  /** List assessors (Insurer/Admin). Use larger `size` on admin assignment screens. */
  getAssessors: async (params?: {
    page?: number;
    size?: number;
  }): Promise<UserProfile[]> => {
    const search = new URLSearchParams();
    if (params?.page != null) search.set("page", String(params.page));
    if (params?.size != null) search.set("size", String(params.size));
    const q = search.toString();
    const path = q ? `/users/assessors?${q}` : "/users/assessors";
    const response = await apiClient.get<unknown>(path);
    const raw = response as Record<string, unknown>;
    if (raw && Array.isArray(raw.items)) {
      return (raw.items as Record<string, unknown>[]).map(mapUserDoc);
    }
    return Array.isArray(response)
      ? (response as Record<string, unknown>[]).map(mapUserDoc)
      : [];
  },

  /** Paginated user directory (Admin only). */
  getUsers: async (params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
  }): Promise<PaginatedUsers<UserProfile>> => {
    const search = new URLSearchParams();
    search.set("page", String(params?.page ?? 0));
    search.set("size", String(params?.size ?? 50));
    if (params?.sortBy) search.set("sortBy", params.sortBy);
    if (params?.sortDirection) search.set("sortDirection", params.sortDirection);
    const response = await apiClient.get<unknown>(`/users?${search.toString()}`);
    const raw = response as Record<string, unknown>;
    const itemsRaw = Array.isArray(raw.items)
      ? (raw.items as Record<string, unknown>[])
      : [];
    return {
      items: itemsRaw.map(mapUserDoc),
      totalItems: Number(raw.totalItems ?? itemsRaw.length),
      totalPages: Number(raw.totalPages ?? 1),
      currentPage: Number(raw.currentPage ?? params?.page ?? 0),
    };
  },

  /** Single user (Admin only) */
  getUserById: async (id: string): Promise<UserProfile> => {
    const data = await apiClient.get<Record<string, unknown>>(`/users/${id}`);
    return mapUserDoc(data);
  },

  deactivateUser: async (id: string): Promise<{ message: string }> => {
    return apiClient.put<{ message: string }>(`/users/${id}/deactivate`, {});
  },
};
