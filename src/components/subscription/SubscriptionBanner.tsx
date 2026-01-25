import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/Button';
import { IoSparkles } from 'react-icons/io5';

export const SubscriptionBanner: React.FC = () => {
  const navigate = useNavigate();
  const { subscription, isTrial, timeRemaining } = useSubscription();

  if (!subscription || !isTrial) return null;

  const remainingMessages = subscription.messageLimit - subscription.messagesUsed;

  return (
    <div className="bg-gradient-to-r from-[#F26E27] via-[#FFFFFF] to-[#12C43F] text-gray-900 p-4 rounded-xl mb-6 border-2 border-primary-300 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-[#F26E27] via-[#FFFFFF] to-[#12C43F] p-2 rounded-full">
            <IoSparkles size={24} className="text-[#F26E27]" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">Période d'essai active</h3>
            <p className="text-sm text-gray-700 font-medium">
              {timeRemaining} restant • {remainingMessages} message{remainingMessages > 1 ? 's' : ''} disponible{remainingMessages > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/subscription')}
          className="bg-secondary-500 hover:bg-secondary-600 text-white"
        >
          Passer Premium
        </Button>
      </div>
    </div>
  );
};

