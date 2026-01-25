import React, { useState } from 'react';
import { IoChatbubbles, IoLogoWhatsapp, IoClose } from 'react-icons/io5';
import { formatPhoneForWhatsApp } from '@/utils/platform';
import { Button } from '@/components/ui/Button';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { User } from '@/types';
import { useAuthStore } from '@/store/authStore';

interface MessagingMenuProps {
  userId: string;
  phone?: string;
  matchName: string;
  otherUser?: User;
  onClose: () => void;
  onDirectMessage?: (user: User) => void;
}

export const MessagingMenu: React.FC<MessagingMenuProps> = ({ phone, matchName, otherUser, onClose, onDirectMessage }) => {
  const [showChatWindow, setShowChatWindow] = useState(false);
  const { user } = useAuthStore();
  const currentUserName = user?.firstName || 'Moi';

  const handleDirectMessage = () => {
    if (otherUser) {
      if (onDirectMessage) {
        // Utiliser le callback si fourni (pour Matches.tsx)
        onDirectMessage(otherUser);
        onClose();
      } else {
        // Sinon, utiliser ChatWindow intégré
        setShowChatWindow(true);
      }
    }
  };

  const getPredefinedMessage = (): string => {
    return `Salut ${matchName}!\nDonc IvoireLove nous a matchés et toi tu voulais laisser ça comme ça ? Impossible !\nMoi c'est ${currentUserName}, viens on fait un peu connaissance, on va bien causer.`;
  };

  const handleWhatsApp = () => {
    if (!phone) {
      return;
    }
    const message = encodeURIComponent(getPredefinedMessage());
    const whatsappUrl = `https://wa.me/${formatPhoneForWhatsApp(phone)}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  if (showChatWindow && otherUser) {
    return (
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full">
        <ChatWindow 
          otherUser={otherUser} 
          onClose={() => {
            setShowChatWindow(false);
            onClose();
          }} 
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-full">
      <div className="p-4 bg-white rounded-lg shadow-lg max-w-md w-full mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Messagerie privée</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <IoClose size={20} />
          </button>
        </div>

        <div className="space-y-3 flex flex-col items-center">
          {/* Message direct dans l'app */}
          <Button
            variant="outline"
            className="w-full bg-green-50 hover:bg-green-100 border-green-300 text-green-700 flex items-center justify-center"
            onClick={handleDirectMessage}
            disabled={!otherUser}
          >
            <IoChatbubbles size={20} className="mr-2 text-blue-500 flex-shrink-0" />
            <span>Écrire un message dans l'application</span>
          </Button>

          {/* WhatsApp */}
          <Button
            variant="outline"
            className="w-full bg-green-50 hover:bg-green-100 border-green-300 text-green-700 flex items-center justify-center"
            onClick={handleWhatsApp}
            disabled={!phone}
          >
            <IoLogoWhatsapp size={20} className="mr-2 text-green-600 flex-shrink-0" />
            <span>Envoyer un message via WhatsApp</span>
          </Button>
          
          {!phone && (
            <p className="text-xs text-gray-500 text-center">
              Numéro de téléphone non disponible pour ce contact
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

