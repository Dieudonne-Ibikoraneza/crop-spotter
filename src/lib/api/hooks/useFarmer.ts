import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { farmerService } from "../services/farmer";
import { farmerKeys, policiesKeys } from "../queryKeys";
import {
  Farm,
  PaginatedResponse,
  DashboardStats,
  MonitoringAlert,
  MonitoringRecord,
  WeatherForecastDataPoint,
  InsuranceRequest,
} from "../types";
import { Policy } from "../services/policies";
import { Claim } from "../services/claims";
import { authService } from "../services/auth";

/**
 * Hook to get farmer-specific dashboard statistics
 */
export function useFarmerDashboardStats() {
  return useQuery<DashboardStats, Error>({
    queryKey: farmerKeys.stats,
    queryFn: () => farmerService.getDashboardStats(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get the farmer's own farms
 */
export function useFarmerFarms() {
  return useQuery<PaginatedResponse<Farm>, Error>({
    queryKey: farmerKeys.farms,
    queryFn: () => farmerService.getOwnFarms(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFarmerFarm(farmId: string | undefined) {
  return useQuery<Farm, Error>({
    queryKey: farmerKeys.farmDetail(farmId ?? ""),
    queryFn: () => farmerService.getFarmById(farmId!),
    enabled: !!farmId && authService.isAuthenticated(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useFarmAlertsForFarm(farmId: string | undefined) {
  return useQuery<MonitoringAlert[], Error>({
    queryKey: farmerKeys.farmAlerts(farmId ?? ""),
    queryFn: () => farmerService.getFarmAlerts(farmId!),
    enabled: !!farmId && authService.isAuthenticated(),
    staleTime: 60 * 1000,
  });
}

export function useFarmerInsuranceRequests() {
  return useQuery<InsuranceRequest[], Error>({
    queryKey: farmerKeys.insuranceRequests,
    queryFn: () => farmerService.getInsuranceRequests(),
    enabled: authService.isAuthenticated(),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get the farmer's insurance policies
 */
export function useFarmerPolicies() {
  return useQuery<Policy[], Error>({
    queryKey: farmerKeys.policies,
    queryFn: () => farmerService.getOwnPolicies(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFarmerPolicy(policyId: string | undefined) {
  return useQuery<Policy, Error>({
    queryKey: [...farmerKeys.policies, "detail", policyId ?? ""],
    queryFn: () => farmerService.getPolicyById(policyId!),
    enabled: !!policyId && authService.isAuthenticated(),
    staleTime: 60 * 1000,
  });
}

export function useFarmerAcknowledgePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (policyId: string) => farmerService.farmerAcknowledgePolicy(policyId),
    onSuccess: (_data, policyId) => {
      queryClient.invalidateQueries({ queryKey: farmerKeys.policies });
      queryClient.invalidateQueries({ queryKey: policiesKeys.detail(policyId) });
      queryClient.invalidateQueries({ queryKey: policiesKeys.list() });
    },
  });
}

export function useFarmerRejectPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ policyId, reason }: { policyId: string; reason: string }) =>
      farmerService.farmerRejectPolicy(policyId, { reason }),
    onSuccess: (_data, { policyId }) => {
      queryClient.invalidateQueries({ queryKey: farmerKeys.policies });
      queryClient.invalidateQueries({ queryKey: policiesKeys.detail(policyId) });
      queryClient.invalidateQueries({ queryKey: policiesKeys.list() });
    },
  });
}

/**
 * Hook to get the farmer's claims
 */
export function useFarmerClaims() {
  return useQuery<Claim[], Error>({
    queryKey: farmerKeys.claims,
    queryFn: () => farmerService.getOwnClaims(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFarmerClaim(claimId: string | undefined) {
  return useQuery<Claim, Error>({
    queryKey: [...farmerKeys.claims, "detail", claimId ?? ""],
    queryFn: () => farmerService.getClaimById(claimId!),
    enabled: !!claimId && authService.isAuthenticated(),
    staleTime: 60 * 1000,
  });
}

export function useFileClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof farmerService.fileClaim>[0]) =>
      farmerService.fileClaim(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerKeys.claims });
      queryClient.invalidateQueries({ queryKey: farmerKeys.stats });
    },
  });
}

/**
 * Hook to get monitoring alerts
 */
export function useFarmerAlerts() {
  return useQuery<MonitoringAlert[], Error>({
    queryKey: farmerKeys.alerts,
    queryFn: () => farmerService.getAlerts(),
    enabled: authService.isAuthenticated(),
    staleTime: 1 * 60 * 1000, // Alerts more frequent
  });
}

/**
 * Register a new farm (simple flow: crop + sowing date)
 */
export function useRegisterFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { cropType: string; sowingDate: string }) => farmerService.registerFarm(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerKeys.farms });
      queryClient.invalidateQueries({ queryKey: farmerKeys.stats });
      queryClient.invalidateQueries({ queryKey: farmerKeys.alerts });
      queryClient.invalidateQueries({ queryKey: farmerKeys.insuranceRequests });
    },
  });
}

/**
 * Hook to get monitoring data for a specific farm
 */
export function useFarmMonitoring(farmId: string) {
  return useQuery<MonitoringRecord[], Error>({
    queryKey: [...farmerKeys.farms, farmId, "monitoring"],
    queryFn: () => farmerService.getFarmMonitoring(farmId),
    enabled: !!farmId && authService.isAuthenticated(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to get weather forecast for a specific farm
 */
export function useFarmWeather(farmId: string, dateStart: string, dateEnd: string) {
  return useQuery<WeatherForecastDataPoint[], Error>({
    queryKey: [...farmerKeys.farms, farmId, "weather", dateStart, dateEnd],
    queryFn: () => farmerService.getWeatherForecast(farmId, dateStart, dateEnd),
    enabled: !!farmId && authService.isAuthenticated(),
    staleTime: 60 * 60 * 1000, // 1 hour stale time for weather
  });
}

export { farmerService };
