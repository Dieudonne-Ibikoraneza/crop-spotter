import { apiClient, authStorage } from "../client";
import { LoginRequest, LoginResponse, UserProfile } from "../types";

// Auth API endpoints
const AUTH_ENDPOINTS = {
  login: "/auth/login",
  profile: "/users/profile",
  changePassword: "/auth/change-password",
} as const;

/**
 * Auth Service - Handles all authentication related API calls
 */
export const authService = {
  /**
   * Login with phone number and password
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      AUTH_ENDPOINTS.login,
      credentials,
    );

    // Save auth data to localStorage
    authStorage.saveAuth(response);

    return response;
  },

  /**
   * Logout - Clear auth data
   */
  logout: (): void => {
    authStorage.clearAll();
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<UserProfile> => {
    return apiClient.get<UserProfile>(AUTH_ENDPOINTS.profile);
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    return apiClient.put<UserProfile>(AUTH_ENDPOINTS.profile, data);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return authStorage.isAuthenticated();
  },

  /**
   * Get stored token
   */
  getToken: (): string | null => {
    return authStorage.getToken();
  },

  /**
   * Get current auth status - combines authentication check and stored user data
   */
  getAuthStatus: () => {
    return {
      isAuthenticated: authStorage.isAuthenticated(),
      user: authStorage.getUser<LoginResponse>(),
    };
  },
};

export default authService;
