import React, { useState } from 'react';
import { IoCall, IoChatbubble, IoClose } from 'react-icons/io5';
import { isMobile, formatPhoneForWhatsApp } from '@/utils/platform';
import { Button } from '@/components/ui/Button';

interface PhoneMenuProps {
  phone: string;
  predefinedMessage?: string;
  onClose: () => void;
}

export const PhoneMenu: React.FC<PhoneMenuProps> = ({ phone, predefinedMessage, onClose }) => {
  const mobile = isMobile();
  const formattedPhone = formatPhoneForWhatsApp(phone);

  const handleCall = () => {
    window.location.href = `tel:${formattedPhone}`;
  };

  const handleSMS = () => {
    // Si un message prédéfini est fourni, l'ajouter au SMS
    if (predefinedMessage) {
      const encodedMessage = encodeURIComponent(predefinedMessage);
      window.location.href = `sms:${formattedPhone}?body=${encodedMessage}`;
    } else {
      window.location.href = `sms:${formattedPhone}`;
    }
  };

  if (!mobile) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Numéro de téléphone</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <IoClose size={20} />
          </button>
        </div>
        <p className="text-gray-600 mb-4">{phone}</p>
        <p className="text-sm text-gray-500">
          Sur mobile, vous pourrez appeler ou envoyer un SMS directement
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Numéro de téléphone</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <IoClose size={20} />
        </button>
      </div>
      <p className="text-gray-600 mb-4">{phone}</p>
      <div className="space-y-2">
        <Button
          variant="primary"
          className="w-full"
          onClick={handleCall}
        >
          <IoCall size={20} className="mr-2" />
          Appeler
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleSMS}
        >
          <IoChatbubble size={20} className="mr-2" />
          Envoyer un SMS
        </Button>
      </div>
    </div>
  );
};

