import { api } from './api';
import { User, SwipeAction } from '@/types';

class UserService {
  async getProfile(): Promise<User> {
    const response = await api.get<User>('/users/profile');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put<User>('/users/profile', data);
    return response.data;
  }

  async uploadPhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post<{ url: string; fullUrl?: string }>('/users/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    // Retourner l'URL (relative ou absolue selon ce que le backend envoie)
    return response.data.url;
  }

  async deletePhoto(photoUrl: string): Promise<void> {
    await api.delete('/users/photos', { data: { photoUrl } });
  }

  async uploadVerificationSelfie(file: File): Promise<{ url: string; user: User }> {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post<{ url: string; user: User }>('/users/verification/selfie', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async submitVerification(): Promise<{ message: string; user: User }> {
    const response = await api.post<{ message: string; user: User }>('/users/verification/submit');
    return response.data;
  }

  async getVerificationStatus(): Promise<{
    verificationStatus: string;
    verificationPhotoUrl: string | null;
    verifiedAt: string | null;
    verified: boolean;
  }> {
    const response = await api.get<{
      verificationStatus: string;
      verificationPhotoUrl: string | null;
      verifiedAt: string | null;
      verified: boolean;
    }>('/users/verification/status');
    return response.data;
  }

  async getDiscoveries(filters?: {
    ageMin?: number;
    ageMax?: number;
    region?: string;
    commune?: string;
    city?: string;
    quartier?: string;
    centerLat?: number;
    centerLng?: number;
    radiusKm?: number;
  }): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.ageMin) params.append('ageMin', filters.ageMin.toString());
      if (filters.ageMax) params.append('ageMax', filters.ageMax.toString());
      if (filters.region) params.append('region', filters.region);
      if (filters.commune) params.append('commune', filters.commune);
      if (filters.city) params.append('city', filters.city);
      if (filters.quartier) params.append('quartier', filters.quartier);
      if (filters.centerLat) params.append('centerLat', filters.centerLat.toString());
      if (filters.centerLng) params.append('centerLng', filters.centerLng.toString());
      if (filters.radiusKm) params.append('radiusKm', filters.radiusKm.toString());
    }
    const response = await api.get<User[]>(`/users/discoveries?${params.toString()}`);
    return response.data;
  }

  async updateOnlineStatus(isOnline: boolean): Promise<void> {
    await api.post('/users/online-status', { isOnline });
  }

  async getUserStats(userId: string): Promise<{ likes: number; dislikes: number }> {
    const response = await api.get<{ likes: number; dislikes: number }>(`/users/${userId}/stats`);
    return response.data;
  }

  async swipe(userId: string, action: SwipeAction): Promise<{ matched: boolean }> {
    const response = await api.post<{ matched: boolean }>('/users/swipe', {
      userId,
      action,
    });
    return response.data;
  }

    async getMatches(): Promise<User[]> {
      const response = await api.get<User[]>('/users/matches');
      return response.data;
    }

    async getAllUsers(filters?: {
      ageMin?: number;
      ageMax?: number;
      region?: string;
      commune?: string;
      city?: string;
      quartier?: string;
      centerLat?: number;
      centerLng?: number;
      radiusKm?: number;
    }): Promise<User[]> {
      const response = await api.get<User[]>('/users/all', { params: filters });
      return response.data;
    }
}

export const userService = new UserService();

