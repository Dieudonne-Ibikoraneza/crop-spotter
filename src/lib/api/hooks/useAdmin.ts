import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/admin";
import { usersService, UserProfile } from "../services/users";
import { authService } from "../services/auth";
import { assessmentsKeys } from "../queryKeys";
import { claimsService } from "../services/claims";
import { cropMonitoringService } from "../services/cropMonitoring";
import { toast } from "sonner";

export const adminKeys = {
  statistics: ["admin", "statistics"] as const,
  recentClaims: (limit: number) => ["admin", "recent-claims", limit] as const,
  pendingFarms: ["admin", "pending-farms"] as const,
  usersDirectory: (page: number, size: number) =>
    ["admin", "users", page, size] as const,
  assessorsList: (page: number, size: number) =>
    ["admin", "assessors", page, size] as const,
  insurersList: ["admin", "insurers"] as const,
};

export function useAdminStatistics() {
  return useQuery({
    queryKey: adminKeys.statistics,
    queryFn: () => adminService.getSystemStatistics(),
    enabled: authService.isAuthenticated(),
    staleTime: 60 * 1000,
  });
}

/** Latest claims for admin dashboard (sorted by filed date) */
export function useAdminRecentClaims(limit = 6) {
  return useQuery({
    queryKey: adminKeys.recentClaims(limit),
    queryFn: async () => {
      const all = await claimsService.getAdminClaims();
      const sorted = [...all].sort((a, b) => {
        const ta = new Date(a.filedAt || 0).getTime();
        const tb = new Date(b.filedAt || 0).getTime();
        return tb - ta;
      });
      return sorted.slice(0, limit);
    },
    enabled: authService.isAuthenticated(),
    staleTime: 30 * 1000,
  });
}

export function usePendingFarms() {
  return useQuery({
    queryKey: adminKeys.pendingFarms,
    queryFn: () => adminService.getPendingFarms(),
    enabled: authService.isAuthenticated(),
    staleTime: 30 * 1000,
  });
}

/** Assessors with a larger page size for assignment dropdowns */
export function useAdminAssessors() {
  return useQuery({
    queryKey: adminKeys.assessorsList(0, 200),
    queryFn: () => usersService.getAssessors({ page: 0, size: 200 }),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Insurer users for optional assignment (from admin user list) */
export function useAdminInsurers() {
  return useQuery({
    queryKey: adminKeys.insurersList,
    queryFn: async (): Promise<UserProfile[]> => {
      const res = await usersService.getUsers({ page: 0, size: 200 });
      return res.items.filter((u) => u.role === "INSURER" && u.active);
    },
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssignAssessorToFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.assignAssessorToFarm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingFarms });
      queryClient.invalidateQueries({ queryKey: adminKeys.statistics });
      queryClient.invalidateQueries({ queryKey: ["admin", "policies", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "claims", "all"] });
      queryClient.invalidateQueries({ queryKey: assessmentsKeys.all });
      toast.success("Assessor assigned. Assessment created for this farm.");
    },
    onError: (err: Error & { message?: string }) => {
      toast.error(err?.message || "Could not assign assessor");
    },
  });
}

export function useAdminUserDirectory(page: number, size: number) {
  return useQuery({
    queryKey: adminKeys.usersDirectory(page, size),
    queryFn: () => usersService.getUsers({ page, size }),
    enabled: authService.isAuthenticated(),
    staleTime: 60 * 1000,
  });
}

export function useAdminPoliciesList() {
  return useQuery({
    queryKey: ["admin", "policies", "list"] as const,
    queryFn: () => adminService.getAllPoliciesList(),
    enabled: authService.isAuthenticated(),
    staleTime: 60 * 1000,
  });
}

export function useUserDetail(id: string | null) {
  return useQuery({
    queryKey: ["users", "admin", "detail", id],
    queryFn: () => usersService.getUserById(id!),
    enabled: !!id && authService.isAuthenticated(),
  });
}

export function useAdminCropMonitoringAll() {
  return useQuery({
    queryKey: ["admin", "crop-monitoring", "all"] as const,
    queryFn: () => cropMonitoringService.listAllAdmin(),
    enabled: authService.isAuthenticated(),
    staleTime: 60 * 1000,
  });
}

export function useAdminAllClaims() {
  return useQuery({
    queryKey: ["admin", "claims", "all"] as const,
    queryFn: () => claimsService.getAdminClaims(),
    enabled: authService.isAuthenticated(),
    staleTime: 30 * 1000,
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersService.deactivateUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: adminKeys.statistics });
      queryClient.invalidateQueries({ queryKey: ["users", "admin", "detail", userId] });
      toast.success("User deactivated.");
    },
    onError: (err: Error & { message?: string }) => {
      toast.error(err?.message || "Could not deactivate user");
    },
  });
}
