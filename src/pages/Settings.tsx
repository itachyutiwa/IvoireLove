import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { IoSettings } from 'react-icons/io5';

export const Settings: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-br from-[#F26E27] via-[#FFFFFF] to-[#12C43F] p-3 rounded-full">
              <IoSettings className="text-2xl" style={{ 
                background: 'linear-gradient(to right, #F26E27, #FFFFFF, #12C43F)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: '#F26E27'
              }} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
          </div>

          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Compte</h2>
              <p className="text-gray-600">
                Gérez les paramètres de votre compte IvoireLove
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Notifications</h2>
              <p className="text-gray-600">
                Configurez vos préférences de notifications
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Confidentialité</h2>
              <p className="text-gray-600">
                Contrôlez qui peut vous voir et vous contacter
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Sécurité</h2>
              <p className="text-gray-600">
                Modifiez votre mot de passe et vos paramètres de sécurité
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Aide et Support</h2>
              <p className="text-gray-600">
                Obtenez de l'aide et contactez le support
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
