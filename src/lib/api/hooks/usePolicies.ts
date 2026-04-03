import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  policiesService,
  Policy,
  CreatePolicyRequest,
} from "../services/policies";
import { authService } from "../services/auth";
import { farmerKeys } from "../queryKeys";

export const policiesKeys = {
  all: ["policies"] as const,
  list: () => ["policies", "list"] as const,
  detail: (id: string) => ["policies", "detail", id] as const,
};

/**
 * Hook to get all policies for the current user
 */
export function useMyPolicies() {
  return useQuery<Policy[], Error>({
    queryKey: policiesKeys.list(),
    queryFn: () => policiesService.listMyPolicies(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to issue a new policy
 */
export function useIssuePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePolicyRequest) =>
      policiesService.issuePolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policiesKeys.list() });
      queryClient.invalidateQueries({ queryKey: farmerKeys.policies });
    },
  });
}

export function usePolicyDetail(policyId: string | undefined) {
  return useQuery<Policy, Error>({
    queryKey: policiesKeys.detail(policyId || ""),
    queryFn: () => policiesService.getPolicy(policyId!),
    enabled: !!policyId && authService.isAuthenticated(),
    staleTime: 60 * 1000,
  });
}
