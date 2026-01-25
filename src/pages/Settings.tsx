import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { IoSettings } from 'react-icons/io5';
import { userService } from '@/services/userService';
import toast from 'react-hot-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { getEntitlements } from '@/utils/entitlements';
import { subscriptionService } from '@/services/subscriptionService';
import { supportService } from '@/services/supportService';
import { SupportTicket } from '@/types';

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { subscription } = useSubscription();
  const [privacy, setPrivacy] = useState({
    hideLastActive: user?.privacy?.hideLastActive === true,
    hideOnline: user?.privacy?.hideOnline === true,
    incognito: user?.privacy?.incognito === true,
    sharePhone: user?.privacy?.sharePhone || 'afterMatch',
  });
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [travelMode, setTravelMode] = useState({
    enabled: user?.travelMode?.enabled === true,
    city: user?.travelMode?.location?.city || '',
    country: user?.travelMode?.location?.country || '',
  });
  const [isSavingTravel, setIsSavingTravel] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPrivacy({
      hideLastActive: user.privacy?.hideLastActive === true,
      hideOnline: user.privacy?.hideOnline === true,
      incognito: user.privacy?.incognito === true,
      sharePhone: user.privacy?.sharePhone || 'afterMatch',
    });
    setTravelMode({
      enabled: user.travelMode?.enabled === true,
      city: user.travelMode?.location?.city || '',
      country: user.travelMode?.location?.country || '',
    });
  }, [user?.id]);

  useEffect(() => {
    const loadTickets = async () => {
      if (!user?.id) return;
      try {
        setIsLoadingTickets(true);
        const data = await supportService.listTickets();
        setTickets(data || []);
      } catch (_e) {
        // silencieux
      } finally {
        setIsLoadingTickets(false);
      }
    };
    loadTickets();
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

  const saveTravelMode = async (next = travelMode) => {
    try {
      const ent = getEntitlements(subscription?.type);
      if (!ent.canTravelMode) {
        toast.error('Mode voyage réservé aux abonnements Premium');
        return;
      }
      setIsSavingTravel(true);
      const updatedUser = await subscriptionService.setTravelMode({
        enabled: next.enabled,
        location: {
          country: next.country || null,
          city: next.city || null,
        },
      });
      updateUser(updatedUser);
      toast.success('Mode voyage mis à jour');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsSavingTravel(false);
    }
  };

  const submitTicket = async () => {
    if (!ticketSubject.trim() || !ticketBody.trim()) {
      toast.error('Veuillez renseigner un sujet et un message');
      return;
    }
    try {
      setIsSubmittingTicket(true);
      const created = await supportService.createTicket(ticketSubject.trim(), ticketBody.trim());
      setTickets((prev) => [created, ...prev]);
      setTicketSubject('');
      setTicketBody('');
      toast.success('Ticket envoyé');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l’envoi');
    } finally {
      setIsSubmittingTicket(false);
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

            {/* Premium */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Premium</h2>
              <p className="text-gray-600">
                Options avancées disponibles avec un abonnement Premium
              </p>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">Mode voyage</p>
                    <p className="text-sm text-gray-600">
                      Définissez une ville/pays cible pour votre mode voyage (MVP).
                    </p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={travelMode.enabled}
                      onChange={(e) => {
                        const next = { ...travelMode, enabled: e.target.checked };
                        setTravelMode(next);
                        saveTravelMode(next);
                      }}
                      disabled={isSavingTravel}
                    />
                    <span className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${travelMode.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform ${travelMode.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </span>
                  </label>
                </div>

                {travelMode.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                      <input
                        value={travelMode.country}
                        onChange={(e) => setTravelMode((p) => ({ ...p, country: e.target.value }))}
                        onBlur={() => saveTravelMode(travelMode)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: Côte d'Ivoire"
                        disabled={isSavingTravel}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                      <input
                        value={travelMode.city}
                        onChange={(e) => setTravelMode((p) => ({ ...p, city: e.target.value }))}
                        onBlur={() => saveTravelMode(travelMode)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: Abidjan"
                        disabled={isSavingTravel}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Aide et Support</h2>
              <p className="text-gray-600">
                Obtenez de l'aide et contactez le support
              </p>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <p className="font-semibold text-gray-900 mb-3">Créer un ticket</p>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                  <input
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
                    placeholder="Ex: Problème de paiement"
                    disabled={isSubmittingTicket}
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={ticketBody}
                    onChange={(e) => setTicketBody(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none mb-3"
                    placeholder="Décrivez votre problème…"
                    disabled={isSubmittingTicket}
                  />
                  <button
                    type="button"
                    onClick={submitTicket}
                    disabled={isSubmittingTicket}
                    className="px-4 py-2 rounded-lg bg-[#F26E27] text-white hover:bg-[#c2581f] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmittingTicket ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="font-semibold text-gray-900 mb-3">Mes tickets</p>
                  {isLoadingTickets ? (
                    <div className="text-sm text-gray-600">Chargement…</div>
                  ) : tickets.length === 0 ? (
                    <div className="text-sm text-gray-600">Aucun ticket.</div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-auto pr-1">
                      {tickets.map((t) => (
                        <div key={t.id} className="p-3 rounded-lg border border-gray-200 bg-white">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold text-gray-900 truncate">{t.subject}</div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              t.status === 'open' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'
                            }`}>
                              {t.status === 'open' ? 'Ouvert' : t.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                            {t.body}
                          </div>
                          <div className="text-xs text-gray-400 mt-2">
                            {new Date(t.createdAt).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
