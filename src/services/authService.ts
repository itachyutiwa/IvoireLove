import { api } from './api';
import { AuthResponse, LoginCredentials, RegisterData, User, Subscription } from '@/types';

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  async register(data: RegisterData): Promise<{ message: string; userId: string; verificationMethod: 'phone' | 'email' }> {
    const response = await api.post<{ message: string; userId: string; verificationMethod: 'phone' | 'email' }>('/auth/register', data);
    return response.data;
  }

  async verifyRegistration(userId: string, code: string, email?: string, phone?: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/verify-registration', { userId, code, email, phone });
    return response.data;
  }

  async resendVerificationCode(userId: string, email?: string, phone?: string): Promise<{ message: string; verificationMethod: 'phone' | 'email' }> {
    const response = await api.post<{ message: string; verificationMethod: 'phone' | 'email' }>('/auth/resend-verification-code', { userId, email, phone });
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  }

  async getSubscription(): Promise<Subscription> {
    const response = await api.get<Subscription>('/auth/subscription');
    return response.data;
  }

  async verifyPhone(phone: string, code: string): Promise<void> {
    await api.post('/auth/verify-phone', { phone, code });
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    await api.post('/auth/verify-email', { email, code });
  }

  async requestPasswordReset(phone: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/forgot-password', { phone });
    return response.data;
  }

  async verifyPasswordResetCode(phone: string, code: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/verify-reset-code', { phone, code });
    return response.data;
  }

  async resetPasswordWithCode(phone: string, code: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/reset-password', { phone, code, newPassword });
    return response.data;
  }

  logout(): void {
    // Le token sera supprimé par le store
  }
}

export const authService = new AuthService();

