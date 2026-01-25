import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { SUBSCRIPTION_PLANS } from '@/utils/constants';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { paymentService } from '@/services/paymentService';
import { IoCheckmarkCircle, IoSparkles } from 'react-icons/io5';
import toast from 'react-hot-toast';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase?: () => void;
  initialPlanType?: string | null;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onPurchase,
  initialPlanType,
}) => {
  const { plans, purchaseSubscription, loadPlans } = useSubscriptionStore();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(initialPlanType || null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Mettre à jour le plan sélectionné quand initialPlanType change
  useEffect(() => {
    if (initialPlanType) {
      setSelectedPlan(initialPlanType);
    }
  }, [initialPlanType]);

  useEffect(() => {
    if (isOpen && plans.length === 0) {
      loadPlans();
    }
  }, [isOpen, plans.length, loadPlans]);

  // Réinitialiser le modal quand il s'ouvre
  useEffect(() => {
    if (isOpen) {
      setShowPaymentModal(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handlePurchase = async () => {
    if (!selectedPlan) {
      toast.error('Veuillez sélectionner un plan');
      return;
    }

    // Ouvrir le modal de paiement
    setShowPaymentModal(true);
  };

  const handlePaymentMethodSelected = (method: string) => {
    // Optionnel : logique supplémentaire lors de la sélection de la méthode
  };

  const handlePaymentConfirmed = async (reference: string, method: string, cardData?: any) => {
    const planToUse = initialPlanType || selectedPlan;
    if (!planToUse) {
      toast.error('Aucun plan sélectionné');
      return;
    }

    setIsLoading(true);
    try {
      const plan = SUBSCRIPTION_PLANS[planToUse as keyof typeof SUBSCRIPTION_PLANS];
      
      if (!plan) {
        toast.error('Plan introuvable');
        setIsLoading(false);
        return;
      }
      
      // Initier le paiement
      const payment = await paymentService.initiatePayment({
        planType: planToUse,
        paymentMethod: method,
        reference: method === 'CARD' ? `CARD-${Date.now()}` : reference,
        amount: plan.price,
        cardData: cardData ? {
          cardNumber: cardData.cardNumber,
          cardCvv: cardData.cardCvv,
          cardExpiry: cardData.cardExpiry,
        } : undefined,
      });

      // Confirmer le paiement
      // Pour les cartes prépayées, la confirmation est automatique
      // Pour les méthodes mobiles, on vérifie la référence
      const confirmedPayment = await paymentService.confirmPayment(
        payment.id,
        method === 'CARD' ? payment.reference : reference,
        cardData
      );

      if (confirmedPayment.status === 'confirmed') {
        // Activer l'abonnement
        await purchaseSubscription(planToUse);
        toast.success('Paiement confirmé ! Abonnement activé avec succès !');
        setShowPaymentModal(false);
        onPurchase?.();
        onClose();
      } else {
        toast.error('Paiement en attente de confirmation. Veuillez vérifier vos informations.');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du paiement');
    } finally {
      setIsLoading(false);
    }
  };

  const availablePlans = Object.values(SUBSCRIPTION_PLANS).filter(
    (plan) => plan.type !== 'trial'
  );

  // Si un plan initial est fourni, l'utiliser directement
  const planToUse = initialPlanType || selectedPlan;
  const plan = planToUse ? SUBSCRIPTION_PLANS[planToUse as keyof typeof SUBSCRIPTION_PLANS] : null;

  // Si un plan initial est fourni, passer directement au paiement
  const handleDirectPurchase = () => {
    if (initialPlanType) {
      setShowPaymentModal(true);
    } else {
      handlePurchase();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !showPaymentModal}
        onClose={onClose}
        title={initialPlanType ? "Confirmer votre abonnement" : "Choisissez votre abonnement"}
        size="lg"
      >
        <div className="space-y-4">
          {initialPlanType && plan ? (
            // Vue simplifiée si un plan est déjà sélectionné
            <>
              <div className="bg-primary-50 rounded-xl p-6 border-2 border-primary-200">
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-3xl font-bold text-primary-600">
                    {plan.price === 0 ? 'Gratuit' : `${plan.price.toLocaleString('fr-FR')} FCFA`}
                  </p>
                </div>

                <ul className="space-y-3 mt-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <IoSparkles className="text-primary-600 mt-0.5 flex-shrink-0" size={18} />
                      <span className="text-gray-700 font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleDirectPurchase}
                  isLoading={isLoading}
                >
                  Procéder au paiement
                </Button>
              </div>
            </>
          ) : (
            // Vue complète avec sélection de plan
            <>
              <p className="text-gray-600 text-center">
                Débloquez tous les avantages et connectez-vous sans limites
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availablePlans.map((plan) => (
                  <div
                    key={plan.type}
                    className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                      selectedPlan === plan.type
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                    onClick={() => setSelectedPlan(plan.type)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {plan.name}
                        </h3>
                        <p className="text-2xl font-bold text-primary-600 mt-1">
                          {plan.price === 0 ? 'Gratuit' : `${plan.price.toLocaleString('fr-FR')} FCFA`}
                        </p>
                      </div>
                      {selectedPlan === plan.type && (
                        <IoCheckmarkCircle className="text-primary-600" size={24} />
                      )}
                    </div>

                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <IoSparkles className="text-primary-600 mt-0.5 flex-shrink-0" size={16} />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handlePurchase}
                  isLoading={isLoading}
                  disabled={!selectedPlan}
                >
                  Souscrire
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal de paiement */}
      {planToUse && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            if (!initialPlanType) {
              // Si pas de plan initial, on peut revenir au modal de sélection
              // Sinon, on ferme tout
              onClose();
            }
          }}
          planType={planToUse}
          onPaymentMethodSelected={handlePaymentMethodSelected}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      )}
    </>
  );
};

