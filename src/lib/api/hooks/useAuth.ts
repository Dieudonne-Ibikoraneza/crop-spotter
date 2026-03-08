import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth';
import { authKeys, usersKeys } from '../queryKeys';
import { LoginRequest, LoginResponse, UserProfile, ApiError } from '../types';
import { authStorage } from '../client';
import { useNavigate } from 'react-router-dom';

interface UseLoginOptions {
  onSuccess?: (data: LoginResponse) => void;
  onError?: (error: ApiError | Error) => void;
}

/**
 * Hook for user login
 * Handles authentication and stores the token
 */
export function useLogin(options?: UseLoginOptions) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data: LoginResponse) => {
      // Save auth data
      authStorage.saveAuth(data);
      
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      
      // Call success callback if provided
      options?.onSuccess?.(data);
      
      // Redirect based on role
      const dashboardPath = getDashboardPath(data.role);
      navigate(dashboardPath);
    },
    onError: (error: Error) => {
      // Convert to unknown first, then to ApiError
      const apiError = error as unknown as ApiError;
      // Call error callback if provided
      options?.onError?.(apiError);
    },
  });
}

/**
 * Hook to get current user profile
 * Requires authentication
 */
export function useProfile() {
  return useQuery({
    queryKey: usersKeys.profile(),
    queryFn: () => authService.getProfile(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to check if user is authenticated
 * Returns the stored user data from localStorage
 */
export function useAuth() {
  const isAuthenticated = authService.isAuthenticated();
  const storedUser = authService.getStoredUser();

  return {
    isAuthenticated,
    user: storedUser,
    isLoading: false,
  };
}

/**
 * Hook for user logout
 * Clears all auth data and redirects to login
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => Promise.resolve(authService.logout()),
    onSuccess: () => {
      // Clear queries
      queryClient.clear();
      
      // Redirect to login
      navigate('/login');
    },
  });
}

/**
 * Hook for updating user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserProfile>) => authService.updateProfile(data),
    onSuccess: () => {
      // Invalidate profile query to refetch
      queryClient.invalidateQueries({ queryKey: usersKeys.profile() });
    },
  });
}

/**
 * Helper function to get dashboard path based on user role
 */
function getDashboardPath(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'FARMER':
      return '/farmer/dashboard';
    case 'ASSESSOR':
      return '/assessor/dashboard';
    case 'INSURER':
      return '/insurer/dashboard';
    case 'GOVERNMENT':
      return '/government/dashboard';
    default:
      return '/';
  }
}

// Re-export for convenience
export { authService };
