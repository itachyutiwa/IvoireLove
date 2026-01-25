import { SubscriptionType } from '@/types';

export type Entitlements = {
  canBoost: boolean;
  canTravelMode: boolean;
  canSeeLikes: boolean;
};

export function getEntitlements(type?: SubscriptionType | null): Entitlements {
  const subType = type || 'trial';
  const isPremium = ['month', '3months', '6months', 'year'].includes(subType);
  return {
    canBoost: isPremium,
    canTravelMode: isPremium,
    canSeeLikes: subType === 'year',
  };
}

