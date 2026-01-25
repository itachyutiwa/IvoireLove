import React, { useState } from 'react';
import { IoPhonePortrait } from 'react-icons/io5';
import { PhoneMenu } from './PhoneMenu';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';

interface ContactActionsProps {
  phone?: string;
  matchName: string;
}

export const ContactActions: React.FC<ContactActionsProps> = ({ phone, matchName }) => {
  const [showPhoneMenu, setShowPhoneMenu] = useState(false);
  const { user } = useAuthStore();
  const currentUserName = user?.firstName || 'Moi';

  const getPredefinedMessage = (): string => {
    return `Salut ${matchName}!\nDonc IvoireLove nous a matchés et toi tu voulais laisser ça comme ça ? Impossible !\nMoi c'est ${currentUserName}, viens on fait un peu connaissance, on va bien causer.`;
  };

  if (!phone) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">
          Aucun numéro de téléphone disponible
        </p>
      </div>
    );
  }

  const displayPhone = phone.replace(/(\d{2})(?=\d)/g, '$1 ');

  return (
    <>
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 mb-2">Numéro de téléphone</p>
          <button
            onClick={() => setShowPhoneMenu(true)}
            className="text-lg font-semibold text-primary-600 hover:text-primary-700 underline decoration-dotted"
          >
            <IoPhonePortrait size={20} className="inline mr-1" />
            {displayPhone}
          </button>
        </div>
      </div>

      <Modal isOpen={showPhoneMenu} onClose={() => setShowPhoneMenu(false)}>
        <PhoneMenu 
          phone={phone} 
          predefinedMessage={getPredefinedMessage()}
          onClose={() => setShowPhoneMenu(false)} 
        />
      </Modal>
    </>
  );
};

