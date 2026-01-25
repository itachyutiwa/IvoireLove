import React, { useEffect } from 'react';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge';
import { Button } from '@/components/ui/Button';
import { SUBSCRIPTION_PLANS } from '@/utils/constants';
import { IoCheckmarkCircle, IoSparkles } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { subscriptionService } from '@/services/subscriptionService';
import { getEntitlements } from '@/utils/entitlements';
import { LikeReceived } from '@/types';

export const Subscription: React.FC = () => {
  const { loadPlans, purchaseSubscription } = useSubscriptionStore();
  const { subscription, isActive, timeRemaining } = useSubscription();
  const [showModal, setShowModal] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<string | null>(null);
  const [likesReceived, setLikesReceived] = React.useState<LikeReceived[]>([]);
  const [isLoadingLikes, setIsLoadingLikes] = React.useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const handlePurchase = async (planType: string) => {
    setSelectedPlan(planType);
    setShowModal(true);
  };

  const handleModalPurchase = async () => {
    if (!selectedPlan) return;
    try {
      await purchaseSubscription(selectedPlan);
      toast.success('Abonnement activé avec succès !');
      setShowModal(false);
    } catch (error: any) {
      toast.error('Erreur lors de l\'achat');
    }
  };

  const loadLikesReceived = async () => {
    if (!subscription) return;
    const ent = getEntitlements(subscription.type);
    if (!ent.canSeeLikes) {
      toast.error('Fonction réservée au Pass VIP');
      return;
    }
    try {
      setIsLoadingLikes(true);
      const data = await subscriptionService.getLikesReceived();
      setLikesReceived(data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des likes');
    } finally {
      setIsLoadingLikes(false);
    }
  };

  const availablePlans = Object.values(SUBSCRIPTION_PLANS).filter(
    (plan) => plan.type !== 'trial'
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Choisissez votre abonnement
        </h1>
        <p className="text-gray-600">
          Débloquez tous les avantages et connectez-vous sans limites
        </p>
      </div>

      {/* Statut actuel */}
      {subscription && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-primary-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Votre abonnement actuel
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {SUBSCRIPTION_PLANS[subscription.type]?.name || 'Essai'}
              </p>
              {isActive ? (
                <p className="text-secondary-600 mt-1 font-medium">
                  Expire dans {timeRemaining}
                </p>
              ) : (
                <p className="text-primary-600 mt-1 font-medium">Expiré</p>
              )}
            </div>
            {isActive && (
              <div className="flex items-center space-x-2 bg-secondary-500 text-white px-4 py-2 rounded-full">
                <IoCheckmarkCircle size={24} />
                <span className="font-medium">Actif</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availablePlans.map((plan) => {
          const isCurrentPlan = subscription?.type === plan.type && subscription?.isActive;
          
          return (
            <div
              key={plan.type}
              className={`bg-white rounded-2xl shadow-lg p-6 border-2 ${
                isCurrentPlan
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-primary-200 hover:border-primary-400 hover:shadow-xl'
              } transition-all`}
            >
              <div className="text-center mb-6">
                <div className="flex flex-col items-center gap-3 mb-4">
                  <SubscriptionBadge type={plan.type} size="lg" />
                  <h3 className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price === 0 ? 'Gratuit' : `${plan.price.toLocaleString('fr-FR')} FCFA`}
                  </span>
                </div>
                {isCurrentPlan && (
                  <span className="inline-block bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium mb-4 shadow-md">
                    Plan actuel
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <IoSparkles className={`${index % 2 === 0 ? 'text-[#F26E27]' : 'text-[#12C43F]'} mt-0.5 flex-shrink-0`} size={18} />
                    <span className="text-gray-700 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={isCurrentPlan ? 'secondary' : 'primary'}
                className="w-full"
                onClick={() => handlePurchase(plan.type)}
                disabled={isCurrentPlan}
              >
                {isCurrentPlan ? 'Plan actuel' : 'Souscrire'}
              </Button>
            </div>
          );
        })}
      </div>

      <SubscriptionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedPlan(null);
        }}
        onPurchase={handleModalPurchase}
        initialPlanType={selectedPlan}
      />

      {/* Voir qui vous a liké (VIP) */}
      {subscription && subscription.isActive && getEntitlements(subscription.type).canSeeLikes && (
        <div className="mt-10 bg-white rounded-2xl shadow-lg p-6 border-2 border-primary-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Qui vous a liké</h2>
              <p className="text-sm text-gray-600">Visible uniquement avec le Pass VIP.</p>
            </div>
            <Button variant="primary" onClick={loadLikesReceived} disabled={isLoadingLikes}>
              {isLoadingLikes ? 'Chargement…' : 'Voir'}
            </Button>
          </div>

          {likesReceived.length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {likesReceived.slice(0, 20).map((item) => {
                const u = item.user;
                const photo = u.photos?.[0]
                  ? (u.photos[0].startsWith('http')
                      ? u.photos[0]
                      : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${u.photos[0]}`)
                  : null;
                return (
                  <div key={`${u.id}-${item.createdAt}`} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200">
                    {photo ? (
                      <img src={photo} className="w-12 h-12 rounded-full object-cover" alt={u.firstName} />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                        {(u.firstName || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.action === 'superlike' ? '⭐ Super Like' : '❤️ Like'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

