import { useQuery } from "@tanstack/react-query";
import { assessorService, farmService, Assessment } from "../services/assessor";
import { assessmentsKeys, farmsKeys } from "../queryKeys";
import { FarmerWithFarms, Farm } from "../types";
import { authService } from "../services/auth";

/**
 * Hook to get list of assigned farmers with their farms
 * This is used in the Assessor Dashboard
 */
export function useAssignedFarmers() {
  return useQuery<FarmerWithFarms[], Error>({
    queryKey: assessmentsKeys.assignedFarmers,
    queryFn: () => assessorService.getAssignedFarmers(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to get a single farm by ID
 * This is used in the Field Detail page
 */
export function useFarm(farmId: string | undefined) {
  return useQuery<Farm, Error>({
    queryKey: farmsKeys.detail(farmId || ""),
    queryFn: () => farmService.getFarm(farmId!),
    enabled: !!farmId && authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to get all assessments for the current assessor
 */
export function useAssessments() {
  return useQuery<Assessment[], Error>({
    queryKey: assessmentsKeys.all,
    queryFn: () => assessorService.getAssessments(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// Re-export for convenience
export { assessorService, farmService };
