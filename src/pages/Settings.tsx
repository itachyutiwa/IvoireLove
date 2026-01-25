import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { IoSettings } from 'react-icons/io5';
import { userService } from '@/services/userService';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [privacy, setPrivacy] = useState({
    hideLastActive: user?.privacy?.hideLastActive === true,
    hideOnline: user?.privacy?.hideOnline === true,
    incognito: user?.privacy?.incognito === true,
    sharePhone: user?.privacy?.sharePhone || 'afterMatch',
  });
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPrivacy({
      hideLastActive: user.privacy?.hideLastActive === true,
      hideOnline: user.privacy?.hideOnline === true,
      incognito: user.privacy?.incognito === true,
      sharePhone: user.privacy?.sharePhone || 'afterMatch',
    });
  }, [user?.id]);

  const savePrivacy = async (nextPrivacy = privacy) => {
    try {
      setIsSavingPrivacy(true);
      const updated = await userService.updateProfile({ privacy: nextPrivacy } as any);
      updateUser(updated);
      toast.success('Confidentialité mise à jour');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsSavingPrivacy(false);
    }
  };

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
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">Masquer ma présence en ligne</p>
                    <p className="text-sm text-gray-600">Les autres ne verront pas “En ligne”.</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={privacy.hideOnline}
                      onChange={(e) => {
                        const next = { ...privacy, hideOnline: e.target.checked };
                        setPrivacy(next);
                        savePrivacy(next);
                      }}
                      disabled={isSavingPrivacy}
                    />
                    <span className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${privacy.hideOnline ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform ${privacy.hideOnline ? 'translate-x-5' : 'translate-x-0'}`} />
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">Masquer “dernière activité”</p>
                    <p className="text-sm text-gray-600">Les autres ne verront pas “En ligne il y a…”.</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={privacy.hideLastActive}
                      onChange={(e) => {
                        const next = { ...privacy, hideLastActive: e.target.checked };
                        setPrivacy(next);
                        savePrivacy(next);
                      }}
                      disabled={isSavingPrivacy}
                    />
                    <span className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${privacy.hideLastActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform ${privacy.hideLastActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">Mode incognito</p>
                    <p className="text-sm text-gray-600">Ne pas apparaître dans les listes de découvertes.</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={privacy.incognito}
                      onChange={(e) => {
                        const next = { ...privacy, incognito: e.target.checked };
                        setPrivacy(next);
                        savePrivacy(next);
                      }}
                      disabled={isSavingPrivacy}
                    />
                    <span className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${privacy.incognito ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform ${privacy.incognito ? 'translate-x-5' : 'translate-x-0'}`} />
                    </span>
                  </label>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 mb-1">Partage du téléphone</p>
                  <p className="text-sm text-gray-600 mb-2">Contrôle quand votre numéro est visible.</p>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={privacy.sharePhone}
                    onChange={(e) => {
                      const next = { ...privacy, sharePhone: e.target.value };
                      setPrivacy(next);
                      savePrivacy(next);
                    }}
                    disabled={isSavingPrivacy}
                  >
                    <option value="afterMatch">Après match</option>
                    <option value="afterXMessages">Après X messages (bientôt)</option>
                    <option value="never">Jamais</option>
                  </select>
                </div>
              </div>
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
