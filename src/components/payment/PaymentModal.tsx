import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PAYMENT_NUMBERS, SUBSCRIPTION_PLANS } from '@/utils/constants';
import { IoPhonePortrait, IoWallet, IoCheckmarkCircle, IoCard } from 'react-icons/io5';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: string;
  onPaymentMethodSelected: (method: string) => void;
  onPaymentConfirmed: (reference: string, method: string, cardData?: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  planType,
  onPaymentMethodSelected,
  onPaymentConfirmed,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fonction pour détecter le type de carte basé sur le numéro
  const getCardType = (number: string): 'visa' | 'mastercard' | 'amex' | 'discover' | null => {
    const cleaned = number.replace(/\s/g, '').replace(/\D/g, '');
    
    if (cleaned.length === 0) return null;
    
    // Visa : commence par 4
    if (cleaned.startsWith('4')) return 'visa';
    
    // Mastercard : commence par 5 (51-55) ou 2 (2221-2720)
    if (cleaned.startsWith('5') && parseInt(cleaned.substring(0, 2)) >= 51 && parseInt(cleaned.substring(0, 2)) <= 55) {
      return 'mastercard';
    }
    if (cleaned.startsWith('2') && parseInt(cleaned.substring(0, 4)) >= 2221 && parseInt(cleaned.substring(0, 4)) <= 2720) {
      return 'mastercard';
    }
    
    // Amex : commence par 34 ou 37
    if (cleaned.startsWith('34') || cleaned.startsWith('37')) return 'amex';
    
    // Discover : commence par 6011, 65, ou 644-649
    if (cleaned.startsWith('6011') || cleaned.startsWith('65') || 
        (cleaned.startsWith('64') && parseInt(cleaned.substring(0, 3)) >= 644 && parseInt(cleaned.substring(0, 3)) <= 649)) {
      return 'discover';
    }
    
    return null;
  };

  const cardType = getCardType(cardNumber);

  const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
  const paymentMethods = [
    { id: 'MTN', name: 'MTN Money', icon: IoPhonePortrait, color: 'bg-yellow-500' },
    { id: 'ORANGE', name: 'Orange Money', icon: IoPhonePortrait, color: 'bg-orange-500' },
    { id: 'MOOV', name: 'Moov Money', icon: IoPhonePortrait, color: 'bg-secondary-500' },
    { id: 'WAVE', name: 'Wave', icon: IoWallet, color: 'bg-green-500' },
    { id: 'CARD', name: 'Carte prépayée', icon: IoCard, color: 'bg-purple-500' },
  ];

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    setReference('');
    setCardNumber('');
    setCardCvv('');
    setCardExpiry('');
    onPaymentMethodSelected(method);
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) {
      toast.error('Veuillez sélectionner une méthode de paiement');
      return;
    }

    // Validation pour les méthodes mobiles
    if (['MTN', 'ORANGE', 'MOOV', 'WAVE'].includes(selectedMethod)) {
      if (!reference.trim()) {
        toast.error('Veuillez entrer la référence du dépôt');
        return;
      }
    }

    // Validation pour les cartes prépayées
    if (selectedMethod === 'CARD') {
      if (!cardNumber.trim() || cardNumber.trim().length < 12) {
        toast.error('Veuillez entrer un numéro de carte valide (12 chiffres minimum)');
        return;
      }
      if (!cardCvv.trim() || cardCvv.trim().length < 3) {
        toast.error('Veuillez entrer un CVV valide (3 chiffres minimum)');
        return;
      }
      if (!cardExpiry.trim()) {
        toast.error('Veuillez entrer la date d\'expiration');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (selectedMethod === 'CARD') {
        onPaymentConfirmed('', selectedMethod, {
          cardNumber: cardNumber.trim(),
          cardCvv: cardCvv.trim(),
          cardExpiry: cardExpiry.trim(),
        });
      } else {
        onPaymentConfirmed(reference.trim(), selectedMethod);
      }
    } catch (error: any) {
      toast.error('Erreur lors de la confirmation du paiement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPaymentNumber = (method: string): string => {
    return PAYMENT_NUMBERS[method as keyof typeof PAYMENT_NUMBERS] || '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Paiement - ${plan?.name || ''}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Montant à payer */}
        <div className="bg-primary-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">Montant à payer</p>
          <p className="text-3xl font-bold text-primary-600">
            {plan?.price.toLocaleString('fr-FR')} FCFA
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Instructions :</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>Sélectionnez votre méthode de paiement</li>
            {selectedMethod && selectedMethod !== 'CARD' && (
              <>
                <li>Effectuez le transfert vers le numéro indiqué</li>
                <li>Entrez la référence du dépôt pour confirmer</li>
              </>
            )}
            {selectedMethod === 'CARD' && (
              <>
                <li>Entrez les informations de votre carte prépayée</li>
                <li>Le paiement sera traité immédiatement</li>
              </>
            )}
          </ol>
        </div>

        {/* Méthodes de paiement */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Choisissez votre méthode de paiement :
          </p>
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              const paymentNumber = getPaymentNumber(method.id);

              return (
                <button
                  key={method.id}
                  onClick={() => handleMethodSelect(method.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`${method.color} p-2 rounded-lg`}>
                      <Icon className="text-white" size={20} />
                    </div>
                    {isSelected && (
                      <IoCheckmarkCircle className="text-primary-600" size={20} />
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{method.name}</p>
                  {isSelected && paymentNumber && (
                    <p className="text-xs text-gray-600 mt-1">
                      Numéro: {paymentNumber}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Saisie de la référence pour les méthodes mobiles */}
        {selectedMethod && ['MTN', 'ORANGE', 'MOOV', 'WAVE'].includes(selectedMethod) && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de compte pour le paiement :
              </label>
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                <p className="text-lg font-mono font-semibold text-gray-900">
                  {getPaymentNumber(selectedMethod)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Référence du dépôt *
              </label>
              <Input
                type="text"
                placeholder="Entrez la référence de votre dépôt"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                La référence se trouve dans le SMS de confirmation de votre opérateur
              </p>
            </div>
          </div>
        )}

        {/* Saisie des informations de carte prépayée */}
        {selectedMethod === 'CARD' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de carte *
              </label>
              <div className="relative">
                {/* Logo de la carte à gauche */}
                {cardType && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                    {cardType === 'visa' && (
                      <div className="w-10 h-6 bg-secondary-600 rounded flex items-center justify-center">
                        <span className="text-white font-bold text-xs">VISA</span>
                      </div>
                    )}
                    {cardType === 'mastercard' && (
                      <div className="w-10 h-6 bg-primary-600 rounded flex items-center justify-center">
                        <span className="text-white font-bold text-xs">MC</span>
                      </div>
                    )}
                    {cardType === 'amex' && (
                      <div className="w-10 h-6 bg-secondary-500 rounded flex items-center justify-center">
                        <span className="text-white font-bold text-xs">AMEX</span>
                      </div>
                    )}
                    {cardType === 'discover' && (
                      <div className="w-10 h-6 bg-orange-600 rounded flex items-center justify-center">
                        <span className="text-white font-bold text-xs">DISC</span>
                      </div>
                    )}
                  </div>
                )}
                <Input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                    setCardNumber(value);
                  }}
                  maxLength={19}
                  className={`w-full ${cardType ? 'pl-14' : ''}`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Entrez le numéro à 12 chiffres minimum de votre carte prépayée
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV *
                </label>
                <Input
                  type="password"
                  placeholder="123"
                  value={cardCvv}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setCardCvv(value);
                  }}
                  maxLength={4}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Code de sécurité (3-4 chiffres)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'expiration *
                </label>
                <Input
                  type="text"
                  placeholder="MM/AA"
                  value={cardExpiry}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length >= 2) {
                      value = value.slice(0, 2) + '/' + value.slice(2, 4);
                    }
                    setCardExpiry(value);
                  }}
                  maxLength={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  MM/AA
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Sécurité :</strong> Vos informations de carte sont sécurisées et ne sont pas stockées sur nos serveurs.
              </p>
            </div>
          </div>
        )}

        {/* Boutons */}
        <div className="flex space-x-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleConfirmPayment}
            isLoading={isSubmitting}
            disabled={
              !selectedMethod ||
              (['MTN', 'ORANGE', 'MOOV', 'WAVE'].includes(selectedMethod) && !reference.trim()) ||
              (selectedMethod === 'CARD' && (!cardNumber.trim() || !cardCvv.trim() || !cardExpiry.trim()))
            }
          >
            {selectedMethod === 'CARD' ? 'Payer maintenant' : 'Confirmer le paiement'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

