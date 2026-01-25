import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Subscription } from '@/types';
import { authService } from '@/services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  subscription: Subscription | null;
  presenceMode: 'online' | 'offline';
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<{ userId: string; verificationMethod: 'phone' | 'email' }>;
  verifyRegistration: (userId: string, code: string, email?: string, phone?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  updateSubscription: (subscription: Subscription) => void;
  setPresenceMode: (mode: 'online' | 'offline') => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      subscription: null,
      presenceMode: 'online',
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        try {
          const response = await authService.login({ email, password });
          set({
            user: response.user,
            token: response.token,
            subscription: response.subscription,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data: any) => {
        try {
          const response = await authService.register(data);
          set({ isLoading: false });
          return { userId: response.userId, verificationMethod: response.verificationMethod };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyRegistration: async (userId: string, code: string, email?: string, phone?: string) => {
        try {
          const response = await authService.verifyRegistration(userId, code, email, phone);
          set({
            user: response.user,
            token: response.token,
            subscription: response.subscription,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          subscription: null,
          isAuthenticated: false,
        });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      updateSubscription: (subscription: Subscription) => {
        set({ subscription });
      },

      setPresenceMode: (mode: 'online' | 'offline') => {
        set({ presenceMode: mode });
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          const user = await authService.getCurrentUser();
          const subscription = await authService.getSubscription();
          set({
            user,
            subscription,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null,
            token: null,
            subscription: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        subscription: state.subscription,
        isAuthenticated: state.isAuthenticated,
        presenceMode: state.presenceMode,
      }),
    }
  )
);

