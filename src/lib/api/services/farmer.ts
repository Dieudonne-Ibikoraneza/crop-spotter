import { apiClient } from "../client";
import {
  Farm,
  PaginatedResponse,
  DashboardStats,
  MonitoringAlert,
  MonitoringRecord,
  WeatherForecastDataPoint,
  InsuranceRequest,
} from "../types";
import { averageNdviAcrossFarms, latestNdviFromMonitoring } from "@/lib/ndvi";
import { Policy } from "./policies";
import { Claim } from "./claims";

/**
 * Farmer Service - Handles all API calls for the farmer portal
 */
export const farmerService = {
  /**
   * Get all farms belonging to the current farmer
   */
  getOwnFarms: async (): Promise<PaginatedResponse<Farm>> => {
    return apiClient.get<PaginatedResponse<Farm>>("/farms");
  },

  getFarmById: async (id: string): Promise<Farm> => {
    return apiClient.get<Farm>(`/farms/${id}`);
  },

  /**
   * Get all insurance policies for the current farmer
   */
  getOwnPolicies: async (): Promise<Policy[]> => {
    // Note: This endpoint might also be paginated in the future
    return apiClient.get<Policy[]>("/policies");
  },

  getPolicyById: async (id: string): Promise<Policy> => {
    return apiClient.get<Policy>(`/policies/${id}`);
  },

  farmerAcknowledgePolicy: async (policyId: string): Promise<Policy> => {
    return apiClient.post<Policy>(`/policies/${policyId}/farmer-acknowledge`, {});
  },

  farmerRejectPolicy: async (
    policyId: string,
    body: { reason: string },
  ): Promise<Policy> => {
    return apiClient.post<Policy>(`/policies/${policyId}/farmer-reject`, body);
  },

  /**
   * Get all claims filed by the current farmer
   */
  getOwnClaims: async (): Promise<Claim[]> => {
    return apiClient.get<Claim[]>("/claims");
  },

  /**
   * Get a specific claim (farmer can only access own claim).
   */
  getClaimById: async (id: string): Promise<Claim> => {
    return apiClient.get<Claim>(`/claims/${id}`);
  },

  /**
   * File a new claim (Farmer).
   */
  fileClaim: async (body: {
    policyId: string;
    lossEventType:
      | "DROUGHT"
      | "FLOOD"
      | "PEST_INFESTATION"
      | "DISEASE"
      | "HAIL"
      | "FIRE"
      | "STORM"
      | "OTHER";
    lossDescription?: string;
    damagePhotos?: string[];
  }): Promise<Claim> => {
    return apiClient.post<Claim>("/claims", body);
  },

  /**
   * Get monitoring data for a specific farm
   */
  getFarmMonitoring: async (farmId: string): Promise<MonitoringRecord[]> => {
    return apiClient.get<MonitoringRecord[]>(`/monitoring/farms/${farmId}`);
  },

  getWeatherForecast: async (farmId: string, dateStart: string, dateEnd: string): Promise<WeatherForecastDataPoint[]> => {
    return apiClient.get<WeatherForecastDataPoint[]>(`/farms/${farmId}/weather/forecast?dateStart=${dateStart}&dateEnd=${dateEnd}`);
  },

  /**
   * Get monitoring alerts for the farmer's lands
   */
  getAlerts: async (): Promise<MonitoringAlert[]> => {
    return apiClient.get<MonitoringAlert[]>("/monitoring/alerts");
  },

  /** Unread alerts for a specific farm (farmer must own the farm). */
  getFarmAlerts: async (farmId: string): Promise<MonitoringAlert[]> => {
    return apiClient.get<MonitoringAlert[]>(`/monitoring/alerts/${farmId}`);
  },

  getInsuranceRequests: async (): Promise<InsuranceRequest[]> => {
    return apiClient.get<InsuranceRequest[]>("/farms/insurance-requests");
  },

  /**
   * Get all available insurers
   */
  getInsurers: async (): Promise<PaginatedResponse<any>> => {
    return apiClient.get<PaginatedResponse<any>>("/users/insurers");
  },

  getInsurerPublicProfile: async (id: string): Promise<any> => {
    return apiClient.get<any>(`/users/insurers/${id}/public`);
  },

  getAssessorProfile: async (id: string): Promise<any> => {
    return apiClient.get<any>(`/users/assessors/${id}/profile`);
  },

  /**
   * Simple farm registration (crop + sowing date). Geometry added later by assessor (KML).
   */
  registerFarm: async (body: { cropType: string; sowingDate: string; insurerId?: string }): Promise<Farm> => {
    return apiClient.post<Farm>("/farms/register", body);
  },

  /**
   * Get aggregated dashboard statistics (no per-farm monitoring calls — avoids duplicate load vs farm rows)
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    const [farmsData, policies, claims] = await Promise.all([
      farmerService.getOwnFarms(),
      farmerService.getOwnPolicies(),
      farmerService.getOwnClaims(),
    ]);

    const activePolicies = Array.isArray(policies) ? policies.filter(p => p.status === "ACTIVE").length : 0;
    const pendingClaims = Array.isArray(claims)
      ? claims.filter(c => c.status === "FILED" || c.status === "IN_PROGRESS").length
      : 0;

    const items = Array.isArray(farmsData.items) ? farmsData.items : [];
    const latestPerFarm = await Promise.all(
      items.map(async (farm) => {
        try {
          const rows = await farmerService.getFarmMonitoring(farm.id);
          const list = Array.isArray(rows) ? rows : [];
          return latestNdviFromMonitoring(list as MonitoringRecord[]);
        } catch {
          return null;
        }
      }),
    );
    const averageHealth = averageNdviAcrossFarms(latestPerFarm);

    return {
      totalFarms:
        farmsData.totalItems ?? items.length,
      activePolicies,
      pendingClaims,
      averageHealth,
    };
  },
};

export default farmerService;
