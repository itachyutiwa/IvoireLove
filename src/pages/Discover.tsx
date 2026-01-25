import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/userService';
import { ProfileCard } from '@/components/discover/ProfileCard';
import { SubscriptionBanner } from '@/components/subscription/SubscriptionBanner';
import { SearchFilters } from '@/components/search/SearchFilters';
import { Modal } from '@/components/ui/Modal';
import { User, SwipeAction } from '@/types';
import { IoSearch } from 'react-icons/io5';
import toast from 'react-hot-toast';

export const Discover: React.FC = () => {
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchFilters, setSearchFilters] = useState<any>({});

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user, searchFilters]);

  const loadProfiles = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await userService.getDiscoveries(searchFilters);
      // Charger les statistiques pour chaque profil
      const profilesWithStats = await Promise.all(
        (data || []).map(async (profile) => {
          try {
            const stats = await userService.getUserStats(profile.id);
            return { ...profile, stats };
          } catch (error) {
            console.error(`Error loading stats for user ${profile.id}:`, error);
            return { ...profile, stats: { likes: 0, dislikes: 0 } };
          }
        })
      );
      setProfiles(profilesWithStats);
      setCurrentIndex(0);
    } catch (error: any) {
      console.error('Error loading profiles:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des profils');
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Mettre à jour le statut en ligne
  useEffect(() => {
    if (user) {
      // Marquer comme en ligne au chargement
      userService.updateOnlineStatus(true);
      
      // Mettre à jour le statut toutes les 30 secondes
      const interval = setInterval(() => {
        userService.updateOnlineStatus(true);
      }, 30000);

      // Marquer comme hors ligne à la fermeture
      const handleBeforeUnload = () => {
        userService.updateOnlineStatus(false);
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        userService.updateOnlineStatus(false);
      };
    }
  }, [user]);

  const handleSwipe = async (direction: 'left' | 'right' | 'up') => {
    if (!profiles[currentIndex]) return;

    const action: SwipeAction =
      direction === 'right' ? 'like' : direction === 'up' ? 'superlike' : 'dislike';

    try {
      const result = await userService.swipe(profiles[currentIndex].id, action);
      
      if (result.matched && direction === 'right') {
        toast.success('🎉 Nouveau match !');
      }

      // Passer au profil suivant
      if (currentIndex < profiles.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Charger plus de profils
        await loadProfiles();
      }
    } catch (error: any) {
      toast.error('Erreur lors du swipe');
    }
  };

  const handleSwipeComplete = () => {
    // Animation terminée, on peut nettoyer si nécessaire
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des profils...</p>
        </div>
      </div>
    );
  }

  if (profiles.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">
            Aucun profil disponible pour le moment
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Il n'y a pas encore d'autres utilisateurs à découvrir. Créez un autre compte pour voir des profils !
          </p>
          <button
            onClick={loadProfiles}
            className="btn-primary"
          >
            Actualiser
          </button>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <SubscriptionBanner />

      {/* Bouton de recherche/filtres */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowFilters(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-primary-200"
        >
          <IoSearch className="text-primary-600" size={20} />
          <span className="text-primary-600 font-medium">Rechercher</span>
        </button>
      </div>

      <div className="relative mb-6" style={{ height: '500px', minHeight: '500px' }}>
        <AnimatePresence mode="wait">
          {currentProfile && (
            <ProfileCard
              key={currentProfile.id}
              user={currentProfile}
              onSwipe={handleSwipe}
              onSwipeComplete={handleSwipeComplete}
              hideSuperlike={true}
            />
          )}
        </AnimatePresence>

        {/* Aperçu du profil suivant */}
        {nextProfile && nextProfile.photos && nextProfile.photos.length > 0 && (
          <div className="absolute inset-0 -z-10 scale-95 opacity-50">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full">
              <div className="h-2/3 bg-gray-200">
                <img
                  src={(() => {
                    const photo = nextProfile.photos[0];
                    return photo.startsWith('http') 
                      ? photo 
                      : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${photo}`;
                  })()}
                  alt={nextProfile.firstName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x600?text=Photo';
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold">
                  {nextProfile.firstName}
                </h3>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Modal de recherche/filtres */}
      <Modal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filtres de recherche"
        size="lg"
      >
        <SearchFilters
          filters={searchFilters}
          onFiltersChange={(filters) => {
            setSearchFilters(filters);
            setShowFilters(false);
          }}
          onClose={() => setShowFilters(false)}
        />
      </Modal>
    </div>
  );
};

