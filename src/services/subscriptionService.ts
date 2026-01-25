import { api } from './api';
import { Subscription, SubscriptionPlan } from '@/types';

class SubscriptionService {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await api.get<SubscriptionPlan[]>('/subscriptions/plans');
    return response.data;
  }

  async getCurrentSubscription(): Promise<Subscription> {
    const response = await api.get<Subscription>('/subscriptions/current');
    return response.data;
  }

  async purchase(planType: string): Promise<Subscription> {
    const response = await api.post<Subscription>('/subscriptions/purchase', {
      planType,
    });
    return response.data;
  }

  async cancel(): Promise<void> {
    await api.post('/subscriptions/cancel');
  }

  async checkLimit(): Promise<{ canSend: boolean; remaining: number }> {
    const response = await api.get<{ canSend: boolean; remaining: number }>(
      '/subscriptions/check-limit'
    );
    return response.data;
  }
}

export const subscriptionService = new SubscriptionService();

