import { apiClient } from "../client";

export interface CropMonitoringRecord {
  _id: string;
  policyId: string | { _id: string; [key: string]: unknown };
  farmId: string | { _id: string; [key: string]: unknown };
  assessorId: string | { _id: string; [key: string]: unknown };
  monitoringNumber: number;
  monitoringDate: string;
  status: "IN_PROGRESS" | "COMPLETED";
  observations?: string[];
  photoUrls?: string[];
  notes?: string;
  weatherData?: unknown;
  ndviData?: unknown;
  reportGenerated?: boolean;
  reportGeneratedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const cropMonitoringService = {
  /** List all monitoring tasks for the current assessor */
  listTasks: async (): Promise<CropMonitoringRecord[]> => {
    return apiClient.get<CropMonitoringRecord[]>("/crop-monitoring");
  },

  /** Get all monitoring records for a specific policy */
  getByPolicy: async (policyId: string): Promise<CropMonitoringRecord[]> => {
    return apiClient.get<CropMonitoringRecord[]>(
      `/crop-monitoring/policy/${policyId}`,
    );
  },

  /** Start a new monitoring cycle for a policy */
  startCycle: async (policyId: string): Promise<CropMonitoringRecord> => {
    return apiClient.post<CropMonitoringRecord>("/crop-monitoring/start", {
      policyId,
    });
  },

  /** Update a monitoring cycle with observations, notes, photos, etc. */
  updateCycle: async (
    id: string,
    updateData: {
      observations?: string[];
      photoUrls?: string[];
      notes?: string;
      ndviData?: object;
    },
  ): Promise<CropMonitoringRecord> => {
    return apiClient.put<CropMonitoringRecord>(
      `/crop-monitoring/${id}`,
      updateData,
    );
  },

  /** Generate the monitoring report (finalises the cycle) */
  generateReport: async (id: string): Promise<CropMonitoringRecord> => {
    return apiClient.post<CropMonitoringRecord>(
      `/crop-monitoring/${id}/generate-report`,
    );
  },

  /** Upload a photo for a monitoring record */
  uploadPhoto: async (
    monitoringId: string,
    file: File,
  ): Promise<{ id: string; url: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.upload<{ id: string; url: string }>(
      `/photos/upload?type=ASSESSMENT&entityId=${monitoringId}`,
      formData,
    );
  },
};
