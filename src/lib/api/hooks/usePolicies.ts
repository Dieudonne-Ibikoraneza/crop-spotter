import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  policiesService,
  Policy,
  CreatePolicyRequest,
} from "../services/policies";
import { authService } from "../services/auth";

export const policiesKeys = {
  all: ["policies"] as const,
  list: () => ["policies", "list"] as const,
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
    },
  });
}
