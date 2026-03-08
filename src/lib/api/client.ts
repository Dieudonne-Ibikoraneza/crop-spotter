import { LoginResponse } from "./types";

// API Base URL - Update this for your environment
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_VERSION = "/api/v1";
const FULL_API_URL = `${API_BASE_URL}${API_VERSION}`;

// Storage keys
const AUTH_TOKEN_KEY = "authToken";
const USER_DATA_KEY = "userData";

// API Response wrapper interface
interface ApiResponse<T> {
  message?: string;
  data: T;
  success?: boolean;
}

// Fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  // Don't set Content-Type for FormData - browser handles it automatically
  const isFormData = options.body instanceof FormData;

  const headers: HeadersInit = isFormData
    ? { ...options.headers }
    : { "Content-Type": "application/json", ...options.headers };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const fullUrl = `${FULL_API_URL}${endpoint}`;
  console.log("DEBUG fetchApi:", {
    url: fullUrl,
    method: options.method || "GET",
    hasBody: !!options.body,
    isFormData,
    headers: {
      ...headers,
      Authorization: token ? "Bearer [token]" : undefined,
    },
  });

  const response = await fetch(`${FULL_API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  console.log("DEBUG fetchApi response:", {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);

    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }

    throw {
      statusCode: 401,
      message: "Session expired. Please login again.",
      error: "Unauthorized",
    };
  }

  // Parse response
  const jsonData = await response.json();

  // Handle error responses
  if (!response.ok) {
    throw {
      statusCode: response.status,
      message: jsonData.message || jsonData.error || "An error occurred",
      error: jsonData.error || "Error",
    };
  }

  // Check if response has the standard wrapper format
  // If data is wrapped in { message, data, success }, extract it
  if (jsonData.data !== undefined && jsonData.success !== undefined) {
    return jsonData.data as T;
  }

  // Otherwise return the whole response
  return jsonData as T;
}

// API Client with common methods
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    return fetchApi<T>(endpoint, { ...options, method: "GET" });
  },

  post: <T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> => {
    return fetchApi<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: <T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> => {
    return fetchApi<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch: <T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> => {
    return fetchApi<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    return fetchApi<T>(endpoint, { ...options, method: "DELETE" });
  },

  // Form data upload (for files)
  upload: <T>(
    endpoint: string,
    formData: FormData,
    options?: RequestInit,
  ): Promise<T> => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    console.log("DEBUG API upload: Starting upload to", endpoint);
    console.log("DEBUG API upload: Token exists:", !!token);
    console.log("DEBUG API upload: FormData has file:", formData.has("file"));

    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    return fetchApi<T>(endpoint, {
      ...options,
      method: "POST",
      body: formData,
      headers,
    });
  },
};

// Auth helpers
export const authStorage = {
  getToken: (): string | null => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  setToken: (token: string): void => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  removeToken: (): void => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  getUser: <T = LoginResponse>(): T | null => {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  setUser: <T = LoginResponse>(user: T): void => {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  },

  removeUser: (): void => {
    localStorage.removeItem(USER_DATA_KEY);
  },

  clearAll: (): void => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  },

  // Save auth data from login response
  saveAuth: (response: LoginResponse): void => {
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(
      USER_DATA_KEY,
      JSON.stringify({
        userId: response.userId,
        role: response.role,
        email: response.email,
        phoneNumber: response.phoneNumber,
        firstLoginRequired: response.firstLoginRequired,
      }),
    );
  },
};

export { AUTH_TOKEN_KEY, USER_DATA_KEY, FULL_API_URL };
export default apiClient;
