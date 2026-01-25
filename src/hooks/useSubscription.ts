import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { getSubscriptionTimeRemaining } from '@/utils/helpers';

export const useSubscription = () => {
  const { subscription: authSubscription } = useAuthStore();
  const { subscription, checkMessageLimit } = useSubscriptionStore();

  const currentSubscription = subscription || authSubscription;

  const isTrial = currentSubscription?.type === 'trial';
  const isActive = currentSubscription?.isActive ?? false;
  const timeRemaining = currentSubscription
    ? getSubscriptionTimeRemaining(currentSubscription.endDate)
    : null;

  const checkLimit = async () => {
    return await checkMessageLimit();
  };

  return {
    subscription: currentSubscription,
    isTrial,
    isActive,
    timeRemaining,
    checkLimit,
  };
};

