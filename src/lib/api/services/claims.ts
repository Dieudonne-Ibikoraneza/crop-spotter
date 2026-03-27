import { apiClient } from "../client";
import { FarmerWithFarms } from "../types";

export interface ClaimAssessment {
  _id: string;
  claimId: string | any;
  assessorId: string;
  observations?: string[];
  photoUrls?: string[];
  notes?: string;
  reportText?: string;
  weatherImpactAnalysis?: string;
  ndviBefore?: number;
  ndviAfter?: number;
  damageArea?: number;
  yieldImpact?: number;
  droneAnalysisPdfs?: any[];
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  _id: string;
  policyId: string | any;
  farmerId: string | any;
  farmId: string | any;
  assessorId?: string | any;
  assessmentReportId?: string | ClaimAssessment;
  lossEventType: string;
  lossDescription: string;
  damagePhotos: string[];
  status: string;
  filedAt: string;
  payoutAmount?: number;
  decisionDate?: string;
  rejectionReason?: string;
}

const CLAIMS_ENDPOINTS = {
  list: "/claims",
  get: (id: string) => `/claims/${id}`,
  assessorClaims: "/claims",
  updateAssessment: (claimId: string) => `/claims/${claimId}/assessment`,
  submitAssessment: (claimId: string) => `/claims/${claimId}/submit-assessment`,
  uploadDronePdf: (claimId: string) => `/claims/${claimId}/upload-drone-pdf`,
  deletePdf: (claimId: string, pdfType: string) => `/claims/${claimId}/pdfs/${pdfType}`,
  getPdfs: (claimId: string) => `/claims/${claimId}/pdfs`,
  getDamageAnalysis: (claimId: string) => `/claims/${claimId}/analysis`,
};

export const claimsService = {
  /** Get all claims for the current assessor */
  getAssessorClaims: async (): Promise<Claim[]> => {
    const response = await apiClient.get<Claim[]>(CLAIMS_ENDPOINTS.assessorClaims);
    return Array.isArray(response) ? response : (response as any).data || [];
  },

  /** Get a single claim by ID */
  getClaim: async (id: string): Promise<Claim> => {
    const response = await apiClient.get<Claim>(CLAIMS_ENDPOINTS.get(id));
    return (response as any).data && !(response as any)._id ? (response as any).data : response;
  },

  /** Update claim assessment data */
  updateAssessment: async (
    claimId: string,
    data: Partial<ClaimAssessment>
  ): Promise<ClaimAssessment> => {
    return apiClient.put<ClaimAssessment>(CLAIMS_ENDPOINTS.updateAssessment(claimId), data);
  },

  /** Submit the final claim assessment */
  submitAssessment: async (claimId: string): Promise<ClaimAssessment> => {
    return apiClient.post<ClaimAssessment>(CLAIMS_ENDPOINTS.submitAssessment(claimId), {});
  },

  /** Upload drone analysis PDF for a claim */
  uploadDronePdf: async (
    claimId: string,
    pdfType: string,
    file: File
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload<any>(
      `${CLAIMS_ENDPOINTS.uploadDronePdf(claimId)}?pdfType=${pdfType}`,
      formData
    );
  },

  /** Delete a drone PDF from a claim */
  deletePdf: async (claimId: string, pdfType: string): Promise<any> => {
    return apiClient.delete<any>(CLAIMS_ENDPOINTS.deletePdf(claimId, pdfType));
  },

  /** Get all uploaded PDFs for a claim */
  getPdfs: async (claimId: string): Promise<any[]> => {
    return apiClient.get<any[]>(CLAIMS_ENDPOINTS.getPdfs(claimId));
  },

  /** Get assessment details for a claim by its assessment ID */
  getAssessmentById: async (assessmentId: string): Promise<ClaimAssessment> => {
    const response = await apiClient.get<ClaimAssessment>(`/assessments/${assessmentId}`);
    return (response as any).data && !(response as any)._id ? (response as any).data : response;
  },

  /** Get automated damage analysis (NDVI before/after) for a claim */
  getDamageAnalysis: async (claimId: string): Promise<any> => {
    return apiClient.get<any>(CLAIMS_ENDPOINTS.getDamageAnalysis(claimId));
  },
};
