import { useQuery } from "@tanstack/react-query";
import { claimsService, Claim } from "../services/claims";
import { authService } from "../services/auth";

export const claimsKeys = {
  all: ["claims"] as const,
  assessor: ["claims", "assessor"] as const,
  insurer: ["claims", "insurer"] as const,
  detail: (id: string) => ["claims", "detail", id] as const,
};

/**
 * Hook to get all claims assigned to the current assessor
 */
export function useAssessorClaims() {
  return useQuery<Claim[], Error>({
    queryKey: claimsKeys.assessor,
    queryFn: () => claimsService.getAssessorClaims(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get all claims for the current insurer
 */
export function useInsurerClaims() {
  return useQuery<Claim[], Error>({
    queryKey: claimsKeys.insurer,
    queryFn: () => claimsService.getInsurerClaims(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get a single claim by ID
 */
export function useClaim(claimId: string | undefined) {
  return useQuery<Claim, Error>({
    queryKey: claimsKeys.detail(claimId || ""),
    queryFn: () => claimsService.getClaim(claimId!),
    enabled: !!claimId && authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get assessment details by assessment ID
 */
export function useAssessmentById(assessmentId: string | undefined | null) {
  return useQuery({
    queryKey: ["assessments", "detail", assessmentId],
    queryFn: () => claimsService.getAssessmentById(assessmentId!),
    enabled: !!assessmentId && authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get all uploaded PDFs for a claim
 */
export function useClaimPdfs(claimId: string | undefined) {
  return useQuery({
    queryKey: ["claims", "pdfs", claimId],
    queryFn: () => claimsService.getPdfs(claimId!),
    enabled: !!claimId && authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}
