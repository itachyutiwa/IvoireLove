import { create } from 'zustand';
import { Subscription, SubscriptionPlan } from '@/types';
import { subscriptionService } from '@/services/subscriptionService';

interface SubscriptionState {
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
  isLoading: boolean;
  setSubscription: (subscription: Subscription) => void;
  loadPlans: () => Promise<void>;
  purchaseSubscription: (planType: string) => Promise<void>;
  checkMessageLimit: () => Promise<{ canSend: boolean; remaining: number }>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscription: null,
  plans: [],
  isLoading: false,

  setSubscription: (subscription: Subscription) => {
    set({ subscription });
  },

  loadPlans: async () => {
    set({ isLoading: true });
    try {
      const plans = await subscriptionService.getPlans();
      set({ plans, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  purchaseSubscription: async (planType: string) => {
    try {
      const subscription = await subscriptionService.purchase(planType);
      set({ subscription });
    } catch (error) {
      throw error;
    }
  },

  checkMessageLimit: async () => {
    // Toujours appeler le backend pour vérifier les limites
    // Le backend gère automatiquement la création d'abonnement en développement
    try {
      return await subscriptionService.checkLimit();
    } catch (error) {
      console.error('Error checking message limit:', error);
      // En développement : permettre l'envoi même en cas d'erreur
      if (import.meta.env.DEV) {
        return { canSend: true, remaining: -1 };
      }
      // En production : bloquer si erreur
      return { canSend: false, remaining: 0 };
    }
  },
}));

