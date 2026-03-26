import { apiClient } from "../client";
import { FarmerWithFarms, Farm } from "../types";

// Assessor API endpoints
const ASSESSOR_ENDPOINTS = {
  assignedFarmers: "/assessments/farmers/list",
  getAssessment: (id: string) => `/assessments/${id}`,
  updateAssessment: (id: string) => `/assessments/${id}`,
  uploadDronePdf: (id: string) => `/assessments/${id}/upload-drone-pdf`,
  deletePdf: (id: string, pdfType: string) => `/assessments/${id}/pdfs/${pdfType}`,
  getPdfs: (id: string) => `/assessments/${id}/pdfs`,
  generateReport: (id: string) => `/assessments/${id}/generate-report`,
  approveAssessment: (id: string) => `/assessments/${id}/approve`,
  rejectAssessment: (id: string) => `/assessments/${id}/reject`,
} as const;

// PDF Types
export type PdfType = "plant_health" | "flowering";

// Assessment types
export interface Assessment {
  _id: string; // API returns _id, not id
  farmId:
    | string
    | { _id: string; name: string; cropType: string; eosdaFieldId: string };
  assessorId:
    | string
    | { _id: string; email: string; firstName: string; lastName: string };
  insurerId?: string;
  status: string;
  riskScore?: number;
  createdAt: string;
  updatedAt: string;
  observations?: string[];
  photoUrls?: string[];
  reportGenerated?: boolean;
  assignedAt?: string;
  comprehensiveNotes?: string;
  droneAnalysisPdfs?: Array<{
    _id: string;
    pdfType: PdfType;
    pdfUrl: string;
    extractedData?: any;
    droneAnalysisData?: any;
    uploadedAt: string;
  }>;
}

export interface PdfInfo {
  pdfType: PdfType;
  pdfUrl: string;
  droneAnalysisData?: {
    stress_levels?: Array<{
      name: string;
      percentage: number;
      hectares: number;
    }>;
    total_affected?: { hectares: number; percentage: number };
    report_info?: {
      crop: string;
      field_area_ha: number;
      growing_stage: string;
      survey_date: string;
      analysis_name: string;
    };
  };
  uploadedAt: string;
}

// Farms API endpoints
const FARMS_ENDPOINTS = {
  getFarm: (id: string) => `/farms/${id}`,
  uploadKml: (id: string) => `/farms/${id}/upload-kml`,
  getAssessmentByFarm: (farmId: string) => `/assessments/farm/${farmId}`,
} as const;

/**
 * Assessor Service - Handles all assessor-related API calls
 */
export const assessorService = {
  /**
   * Get list of assigned farmers with their farms
   */
  getAssignedFarmers: async (): Promise<FarmerWithFarms[]> => {
    return apiClient.get<FarmerWithFarms[]>(ASSESSOR_ENDPOINTS.assignedFarmers);
  },

  /**
   * Get all assessments (same as Starhawk)
   */
  getAssessments: async (): Promise<Assessment[]> => {
    try {
      const response = await apiClient.get<Assessment[]>("/assessments");
      // The API returns assessments directly, not wrapped in a data property
      const assessments = Array.isArray(response)
        ? response
        : (response as any).data || [];
      return assessments;
    } catch (error) {
      console.error("❌ Error fetching assessments:", error);
      return [];
    }
  },

  /**
   * Get assessment by ID
   */
  getAssessment: async (id: string): Promise<Assessment> => {
    return apiClient.get<Assessment>(ASSESSOR_ENDPOINTS.getAssessment(id));
  },

  /**
   * Update assessment (for comprehensive notes)
   */
  updateAssessment: async (
    id: string,
    data: { comprehensiveNotes?: string },
  ): Promise<Assessment> => {
    return apiClient.put<Assessment>(
      ASSESSOR_ENDPOINTS.updateAssessment(id),
      data,
    );
  },

  /**
   * Upload drone analysis PDF
   * @param assessmentId - The assessment ID
   * @param pdfType - Type of PDF (plant_health or flowering)
   * @param file - The PDF file
   */
  uploadDronePdf: async (
    assessmentId: string,
    pdfType: PdfType,
    file: File,
  ): Promise<{ success: boolean; pdfInfo: PdfInfo }> => {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.upload<{ success: boolean; pdfInfo: PdfInfo }>(
      `${ASSESSOR_ENDPOINTS.uploadDronePdf(assessmentId)}?pdfType=${pdfType}`,
      formData,
    );
  },

  /**
   * Get all PDFs for an assessment
   */
  getPdfs: async (assessmentId: string): Promise<PdfInfo[]> => {
    return apiClient.get<PdfInfo[]>(ASSESSOR_ENDPOINTS.getPdfs(assessmentId));
  },

  /**
   * Generate full assessment report
   */
  generateReport: async (assessmentId: string): Promise<Assessment> => {
    return apiClient.post<Assessment>(
      ASSESSOR_ENDPOINTS.generateReport(assessmentId),
    );
  },

  /**
   * Approve assessment (Insurer only)
   */
  approveAssessment: async (assessmentId: string): Promise<Assessment> => {
    return apiClient.post<Assessment>(
      ASSESSOR_ENDPOINTS.approveAssessment(assessmentId),
    );
  },

  /**
   * Reject assessment (Insurer only)
   */
  rejectAssessment: async (assessmentId: string): Promise<Assessment> => {
    return apiClient.post<Assessment>(
      ASSESSOR_ENDPOINTS.rejectAssessment(assessmentId),
    );
  },

  /**
   * Delete a specific drone PDF from an assessment
   */
  deletePdf: async (assessmentId: string, pdfType: string): Promise<any> => {
    return apiClient.delete<any>(
      ASSESSOR_ENDPOINTS.deletePdf(assessmentId, pdfType),
    );
  },
};

/**
 * Farm Service - Handles farm-related API calls
 */
export const farmService = {
  /**
   * Get a single farm by ID
   */
  getFarm: async (id: string): Promise<Farm> => {
    return apiClient.get<Farm>(FARMS_ENDPOINTS.getFarm(id));
  },

  /**
   * Get assessment by farm ID
   */
  getAssessment: async (farmId: string): Promise<Assessment> => {
    return apiClient.get<Assessment>(
      FARMS_ENDPOINTS.getAssessmentByFarm(farmId),
    );
  },

  /**
   * Upload KML file for a farm to complete registration
   * @param farmId - The farm ID
   * @param name - The field name
   * @param file - The KML file
   */
  uploadKml: async (
    farmId: string,
    name: string,
    file: File,
  ): Promise<Farm> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);

    return apiClient.upload<Farm>(FARMS_ENDPOINTS.uploadKml(farmId), formData);
  },
};

export default { ...assessorService, ...farmService };
