import { apiClient } from "../client";
import { PhotoType } from "../types";

export interface PhotoResponse {
  id: string;
  url: string;
}

export const photosService = {
  /**
   * Upload a photo
   */
  uploadPhoto: async (
    file: File | Blob,
    type: string,
    entityId: string,
    onProgress?: (percent: number) => void,
  ): Promise<{ id: string; url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    
    return apiClient.upload<{ id: string; url: string }>(
      `/photos/upload?type=${type}&entityId=${entityId}`,
      formData,
      { onProgress },
    );
  },

  /**
   * Clear a profile photo or logo
   */
  clearProfilePhoto: async (
    entityId: string,
    type: string,
  ): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(
      `/photos/entity/${entityId}?type=${type}`,
    );
  },

  /**
   * Get photos by entity
   */
  getPhotosByEntity: async (
    entityId: string,
    type: string,
  ): Promise<PhotoResponse[]> => {
    return apiClient.get<PhotoResponse[]>(`/photos/entity/${entityId}?type=${type}`);
  },

  /**
   * Delete a photo
   */
  deletePhoto: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/photos/${id}`);
  },
};

export default photosService;
