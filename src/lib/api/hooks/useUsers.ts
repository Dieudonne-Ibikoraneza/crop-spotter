import { useQuery } from "@tanstack/react-query";
import { usersService, UserProfile } from "../services/users";
import { authService } from "../services/auth";

export const usersKeys = {
  all: ["users"] as const,
  assessors: ["users", "assessors"] as const,
};

/**
 * Hook to get all assessors
 */
export function useAssessors() {
  return useQuery<UserProfile[], Error>({
    queryKey: usersKeys.assessors,
    queryFn: () => usersService.getAssessors(),
    enabled: authService.isAuthenticated(),
    staleTime: 10 * 60 * 1000,
  });
}
