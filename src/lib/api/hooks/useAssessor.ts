import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assessorService, farmService, Assessment } from "../services/assessor";
import { assessmentsKeys, farmsKeys, farmerKeys } from "../queryKeys";
import { FarmerWithFarms, Farm } from "../types";
import { authService } from "../services/auth";
import farmerService from "../services/farmer";

/**
 * Hook to get insurance requests (Insurer sees all, Farmer sees their own)
 */
export function useInsuranceRequests() {
  return useQuery({
    queryKey: farmerKeys.insuranceRequests,
    queryFn: () => farmerService.getInsuranceRequests(),
    enabled: authService.isAuthenticated(),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to create an assessment (Insurer only)
 */
export function useCreateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { farmId: string; assessorId: string }) =>
      assessorService.createAssessment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: farmerKeys.insuranceRequests });
    },
  });
}

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

/**
 * Hook to get a single assessment by ID
 */
export function useAssessmentDetail(id: string | undefined) {
  return useQuery<Assessment, Error>({
    queryKey: assessmentsKeys.detail(id || ""),
    queryFn: () => assessorService.getAssessment(id!),
    enabled: !!id && authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Approve assessment (insurer)
 */
export function useApproveAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assessmentId: string) => assessorService.approveAssessment(assessmentId),
    onSuccess: (_, assessmentId) => {
      queryClient.invalidateQueries({ queryKey: assessmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentsKeys.detail(assessmentId) });
    },
  });
}

/**
 * Reject assessment (insurer)
 */
export function useRejectAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assessmentId: string) => assessorService.rejectAssessment(assessmentId),
    onSuccess: (_, assessmentId) => {
      queryClient.invalidateQueries({ queryKey: assessmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentsKeys.detail(assessmentId) });
    },
  });
}

// Re-export for convenience
export { assessorService, farmService };
