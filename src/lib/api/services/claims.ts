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
  policyId:
    | string
    | {
        _id: string;
        policyNumber?: string;
        status?: string;
        coverageLevel?: string;
        premiumAmount?: number;
      };
  farmerId:
    | string
    | { _id: string; firstName?: string; lastName?: string; email?: string };
  farmId:
    | string
    | {
        _id: string;
        name?: string;
        cropType?: string;
        area?: number;
        locationName?: string;
      };
  assessorId?:
    | string
    | { _id: string; firstName?: string; lastName?: string; email?: string };
  assessmentReportId?: string | ClaimAssessment;
  lossEventType: string;
  claimType?: "FARMER_REPORTED_LOSS" | "HARVEST_AUTO_SUBMISSION";
  lossDescription?: string;
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
  assignAssessor: (claimId: string) => `/claims/${claimId}/assign`,
  approveClaim: (claimId: string) => `/claims/${claimId}/approve`,
  rejectClaim: (claimId: string) => `/claims/${claimId}/reject`,
  uploadDronePdf: (claimId: string) => `/claims/${claimId}/upload-drone-pdf`,
  deletePdf: (claimId: string, pdfType: string) =>
    `/claims/${claimId}/pdfs/${pdfType}`,
  getPdfs: (claimId: string) => `/claims/${claimId}/pdfs`,
  getDamageAnalysis: (claimId: string) => `/claims/${claimId}/analysis`,
};

export const claimsService = {
  /** All claims (ADMIN role) or role-scoped list */
  getAdminClaims: async (): Promise<Claim[]> => {
    const response = await apiClient.get<Claim[]>(CLAIMS_ENDPOINTS.list);
    return Array.isArray(response) ? response : (response as { data?: Claim[] }).data || [];
  },

  /** Get all claims for the current assessor */
  getAssessorClaims: async (): Promise<Claim[]> => {
    const response = await apiClient.get<Claim[]>(
      CLAIMS_ENDPOINTS.assessorClaims,
    );
    return Array.isArray(response) ? response : (response as any).data || [];
  },

  /** Get all claims for the current insurer */
  getInsurerClaims: async (): Promise<Claim[]> => {
    const response = await apiClient.get<Claim[]>("/claims");
    return Array.isArray(response) ? response : (response as any).data || [];
  },

  /** Assign an assessor to a claim (Insurer only) */
  assignAssessor: async (
    claimId: string,
    assessorId: string,
  ): Promise<Claim> => {
    return apiClient.put<Claim>(CLAIMS_ENDPOINTS.assignAssessor(claimId), {
      assessorId,
    });
  },

  /** Approve a claim (Insurer only) */
  approveClaim: async (
    claimId: string,
    payoutAmount: number,
  ): Promise<Claim> => {
    return apiClient.put<Claim>(CLAIMS_ENDPOINTS.approveClaim(claimId), {
      payoutAmount,
    });
  },

  /** Reject a claim (Insurer only) */
  rejectClaim: async (
    claimId: string,
    rejectionReason: string,
  ): Promise<Claim> => {
    return apiClient.put<Claim>(CLAIMS_ENDPOINTS.rejectClaim(claimId), {
      rejectionReason,
    });
  },

  /** Get a single claim by ID */
  getClaim: async (id: string): Promise<Claim> => {
    const response = await apiClient.get<Claim>(CLAIMS_ENDPOINTS.get(id));
    return (response as any).data && !(response as any)._id
      ? (response as any).data
      : response;
  },

  /** Update claim assessment data */
  updateAssessment: async (
    claimId: string,
    data: Partial<ClaimAssessment>,
  ): Promise<ClaimAssessment> => {
    return apiClient.put<ClaimAssessment>(
      CLAIMS_ENDPOINTS.updateAssessment(claimId),
      data,
    );
  },

  /** Submit the final claim assessment */
  submitAssessment: async (claimId: string): Promise<ClaimAssessment> => {
    return apiClient.post<ClaimAssessment>(
      CLAIMS_ENDPOINTS.submitAssessment(claimId),
      {},
    );
  },

  /** Upload drone analysis PDF for a claim */
  uploadDronePdf: async (
    claimId: string,
    pdfType: string,
    file: File,
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload<any>(
      `${CLAIMS_ENDPOINTS.uploadDronePdf(claimId)}?pdfType=${pdfType}`,
      formData,
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
    const response = await apiClient.get<ClaimAssessment>(
      `/assessments/${assessmentId}`,
    );
    return (response as any).data && !(response as any)._id
      ? (response as any).data
      : response;
  },

  /** Get automated damage analysis (NDVI before/after) for a claim */
  getDamageAnalysis: async (claimId: string): Promise<any> => {
    return apiClient.get<any>(CLAIMS_ENDPOINTS.getDamageAnalysis(claimId));
  },
};
