import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/userService';
import { User } from '@/types';
import { getAge } from '@/utils/helpers';
import { ProfileCard } from '@/components/discover/ProfileCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IoSearch, IoClose, IoLocationOutline, IoHeart } from 'react-icons/io5';
import toast from 'react-hot-toast';

// Structure des villes/régions et communes/quartiers de Côte d'Ivoire
// Note: Les villes peuvent aussi être des régions pour la recherche
const CITIES_AND_COMMUNES: Record<string, string[]> = {
  'Abidjan': [
    'Cocody', 'Marcory', 'Yopougon', 'Treichville', 'Adjamé', 'Attécoubé',
    'Koumassi', 'Port-Bouët', 'Abobo', 'Anyama', 'Bingerville', 'Plateau'
  ],
  'Lagunes': [
    'Cocody', 'Marcory', 'Yopougon', 'Treichville', 'Adjamé', 'Attécoubé',
    'Koumassi', 'Port-Bouët', 'Abobo', 'Anyama', 'Bingerville', 'Plateau',
    'Grand-Bassam', 'Jacqueville', 'Bonoua'
  ],
  'Yamoussoukro': [
    'Attiégouakro', 'Kpouébo', 'Lolobo', 'Morofé', 'N\'Gattakro', 'Yamoussoukro-Centre'
  ],
  'Lacs': [
    'Attiégouakro', 'Kpouébo', 'Lolobo', 'Morofé', 'N\'Gattakro', 'Yamoussoukro-Centre'
  ],
  'Bouaké': [
    'Bouaké-Centre', 'Brobo', 'Didiévi', 'Sakassou', 'Toumodi'
  ],
  'Vallée du Bandama': [
    'Bouaké-Centre', 'Brobo', 'Didiévi', 'Sakassou', 'Toumodi'
  ],
  'Daloa': [
    'Daloa-Centre', 'Issia', 'Vavoua', 'Zoukougbeu', 'Gagnoa'
  ],
  'Haut-Sassandra': [
    'Daloa-Centre', 'Issia', 'Vavoua', 'Zoukougbeu', 'Gagnoa'
  ],
  'San-Pédro': [
    'San-Pédro-Centre', 'Sassandra', 'Tabou', 'Grand-Béréby'
  ],
  'Bas-Sassandra': [
    'San-Pédro-Centre', 'Sassandra', 'Tabou', 'Grand-Béréby'
  ],
  'Korhogo': [
    'Korhogo-Centre', 'Ferkessédougou', 'Boundiali', 'M\'Bengué'
  ],
  'Man': [
    'Man-Centre', 'Danané', 'Guiglo', 'Toulepleu', 'Duékoué'
  ],
  'Divo': [
    'Divo-Centre', 'Lakota', 'Guitry', 'Fresco'
  ],
  'Gagnoa': [
    'Gagnoa-Centre', 'Oumé', 'Divo', 'Lakota'
  ],
  'Abengourou': [
    'Abengourou-Centre', 'Agnibilékro', 'Bettié', 'M\'Batto'
  ],
  'Grand-Bassam': [
    'Grand-Bassam-Centre', 'Bingerville', 'Bonoua', 'Jacqueville'
  ],
  'Bingerville': [
    'Bingerville-Centre', 'Anyama', 'Cocody', 'Abidjan'
  ],
};

// Coordonnées approximatives (lat, lng) pour les principales villes/régions
const CITY_REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  // Abidjan et alentours
  'Abidjan': { lat: 5.3600, lng: -4.0083 },
  'Lagunes': { lat: 5.3600, lng: -4.0083 },
  'Cocody': { lat: 5.3476, lng: -3.9864 },
  'Marcory': { lat: 5.3006, lng: -3.9725 },
  'Yopougon': { lat: 5.3300, lng: -4.0700 },
  'Plateau': { lat: 5.3214, lng: -4.0161 },
  'Koumassi': { lat: 5.3000, lng: -3.9500 },
  'Port-Bouët': { lat: 5.2610, lng: -3.9723 },
  'Treichville': { lat: 5.3000, lng: -4.0200 },
  'Abobo': { lat: 5.4167, lng: -4.0167 },
  'Anyama': { lat: 5.4948, lng: -4.0518 },
  'Bingerville': { lat: 5.3569, lng: -3.8859 },

  // Yamoussoukro et région
  'Yamoussoukro': { lat: 6.8276, lng: -5.2893 },
  'Lacs': { lat: 6.8276, lng: -5.2893 },
  "Yamoussoukro-Centre": { lat: 6.8276, lng: -5.2893 },

  // Bouaké et région
  'Bouaké': { lat: 7.6939, lng: -5.0303 },
  'Vallée du Bandama': { lat: 7.6939, lng: -5.0303 },
  'Bouaké-Centre': { lat: 7.6939, lng: -5.0303 },

  // Daloa et région
  'Daloa': { lat: 6.8774, lng: -6.4502 },
  'Haut-Sassandra': { lat: 6.8774, lng: -6.4502 },
  'Daloa-Centre': { lat: 6.8774, lng: -6.4502 },

  // San-Pédro et région
  'San-Pédro': { lat: 4.7485, lng: -6.6363 },
  'Bas-Sassandra': { lat: 4.7485, lng: -6.6363 },
  'San-Pédro-Centre': { lat: 4.7485, lng: -6.6363 },

  // Autres grandes villes (approximatif)
  'Korhogo': { lat: 9.4580, lng: -5.6296 },
  'Man': { lat: 7.4125, lng: -7.5538 },
  'Divo': { lat: 5.8372, lng: -5.3572 },
  'Gagnoa': { lat: 6.1319, lng: -5.9476 },
  'Abengourou': { lat: 6.7297, lng: -3.4964 },
  'Grand-Bassam': { lat: 5.2118, lng: -3.7388 },
};

const CITIES = Object.keys(CITIES_AND_COMMUNES);

export const Filter: React.FC = () => {
  const { user } = useAuthStore();
  const [, setProfiles] = useState<User[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [matchedUserIds, setMatchedUserIds] = useState<Set<string>>(new Set());
  
  // Filtres
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedCommune, setSelectedCommune] = useState<string>('');
  const [ageMin, setAgeMin] = useState<number>(18);
  const [ageMax, setAgeMax] = useState<number>(99);
  const [searchName, setSearchName] = useState<string>('');
  const [allProfiles, setAllProfiles] = useState<User[]>([]); // Tous les profils chargés
  
  // Initialiser les valeurs d'âge depuis les préférences utilisateur
  useEffect(() => {
    if (user?.preferences?.ageRange) {
      setAgeMin(user.preferences.ageRange.min || 18);
      setAgeMax(user.preferences.ageRange.max || 99);
    }
  }, [user]);
  
  // Communes disponibles selon la ville sélectionnée
  const availableCommunes = selectedCity && CITIES_AND_COMMUNES[selectedCity]
    ? CITIES_AND_COMMUNES[selectedCity]
    : [];
  
  // Réinitialiser la commune quand la ville change
  useEffect(() => {
    if (selectedCity) {
      setSelectedCommune('');
    }
  }, [selectedCity]);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const initializingMapRef = useRef<boolean>(false);

  // Fonction pour charger les matchs
  const loadMatches = async () => {
    if (!user) return;
    try {
      const matches = await userService.getMatches();
      const matchedIds = new Set(matches.map((match) => match.id));
      setMatchedUserIds(matchedIds);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  // Recharger les matchs après un swipe pour mettre à jour l'état
  const reloadMatches = async () => {
    await loadMatches();
  };

  useEffect(() => {
    if (user) {
      loadAllProfiles();
      // Charger le script Google Maps au démarrage
      loadGoogleMapsScript();
      // Charger les matchs pour savoir quels profils ont déjà matché
      loadMatches();
    }
  }, [user]);

  // Forcer l'affichage de la carte après 5 secondes même si mapLoaded est false
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!mapLoaded && mapInstanceRef.current) {
        console.log('Forcing mapLoaded to true after timeout');
        setMapLoaded(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [mapLoaded]);

  // Fonction pour ajouter les marqueurs sur la carte
  const addMarkersToMap = React.useCallback(() => {
    if (!mapInstanceRef.current) {
      console.warn('Cannot add markers: map instance not ready');
      return;
    }

    const google = (window as any).google;
    if (!google || !google.maps) {
      console.warn('Cannot add markers: Google Maps not loaded');
      return;
    }

    // Nettoyer les marqueurs précédents
    markersRef.current.forEach((marker) => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];

    // Pour chaque profil, utiliser ses coordonnées ou celles de sa ville/région
    const profilesToDisplay = filteredProfiles.map((profile) => {
      let position: { lat: number; lng: number } | null = null;

      // Si le profil a des coordonnées, les utiliser
      if (profile.location?.coordinates?.lat && profile.location?.coordinates?.lng) {
        position = {
          lat: profile.location.coordinates.lat,
          lng: profile.location.coordinates.lng,
        };
      } else {
        // Sinon, utiliser les coordonnées de la ville/région du profil
        const cityKey = profile.location?.city || profile.location?.region;
        if (cityKey && CITY_REGION_COORDS[cityKey]) {
          position = CITY_REGION_COORDS[cityKey];
        } else {
          // Fallback sur Abidjan si aucune ville/région connue
          position = CITY_REGION_COORDS['Abidjan'] || { lat: 5.3600, lng: -4.0083 };
        }
      }

      return { profile, position };
    });

    console.log('Adding markers for', profilesToDisplay.length, 'profiles');
    console.log('Total filtered profiles:', filteredProfiles.length);

    // Ajouter les marqueurs pour tous les profils
    profilesToDisplay.forEach(({ profile, position }) => {
      if (!position) return;

      const photoUrl = profile.photos && profile.photos.length > 0
        ? (profile.photos[0].startsWith('http')
            ? profile.photos[0]
            : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${profile.photos[0]}`)
        : 'https://via.placeholder.com/50x50?text=Photo';

      // Utiliser position au lieu de profile.location.coordinates

      const infoContent = `
        <div style="padding: 8px; min-width: 150px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <img src="${photoUrl}" alt="${profile.firstName}" 
                 style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" 
                 onerror="this.src='https://via.placeholder.com/40x40?text=Photo'" />
            <div>
              <div style="font-weight: bold; font-size: 14px;">${profile.firstName}, ${getAge(profile.dateOfBirth)}</div>
              <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${profile.isOnline ? '#10b981' : '#ef4444'};"></div>
                <span style="font-size: 12px; color: #666;">${profile.isOnline ? 'En ligne' : 'Hors ligne'}</span>
              </div>
            </div>
          </div>
          <button onclick="window.selectProfileFromMap('${profile.id}')" 
                  style="width: 100%; padding: 6px; background-color: #F26E27; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            Voir le profil
          </button>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoContent,
      });

      // Créer une icône circulaire pour le marqueur (photo de profil + voyant de présence)
      // Utiliser Canvas pour créer une image circulaire avec la photo réelle
      const createCircularIconWithStatus = (imageUrl: string, isOnline: boolean, callback: (iconUrl: string) => void) => {
        const canvas = document.createElement('canvas');
        canvas.width = 56;
        canvas.height = 56;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          callback(defaultIcon(profile.isOnline || false));
          return;
        }

        const statusColor = isOnline ? '#10b981' : '#ef4444';
        
        // Charger l'image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          // Dessiner le fond blanc pour la bordure
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(28, 28, 25, 0, 2 * Math.PI);
          ctx.fill();
          
          // Clipper pour le cercle
          ctx.save();
          ctx.beginPath();
          ctx.arc(28, 28, 25, 0, 2 * Math.PI);
          ctx.clip();
          
          // Dessiner l'image
          ctx.drawImage(img, 3, 3, 50, 50);
          ctx.restore();
          
          // Bordure blanche
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(28, 28, 25, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Voyant de présence en bas à droite
          ctx.fillStyle = statusColor;
          ctx.beginPath();
          ctx.arc(45, 45, 8, 0, 2 * Math.PI);
          ctx.fill();
          
          // Bordure blanche pour le voyant
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(45, 45, 8, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Animation pour utilisateurs en ligne (cercle pulsant)
          if (isOnline) {
            ctx.fillStyle = statusColor;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(45, 45, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }
          
          callback(canvas.toDataURL());
        };
        
        img.onerror = () => {
          // En cas d'erreur, utiliser l'icône par défaut
          callback(defaultIcon(profile.isOnline || false));
        };
        
        img.src = imageUrl;
      };

      // Icône par défaut si pas de photo (avec voyant de présence)
      const defaultIcon = (isOnline: boolean): string => {
        const canvas = document.createElement('canvas');
        canvas.width = 56;
        canvas.height = 56;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
            <svg width="56" height="56" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="25" fill="#cccccc"/>
              <circle cx="28" cy="28" r="25" fill="none" stroke="#fff" stroke-width="3"/>
              <text x="28" y="33" font-family="Arial" font-size="20" fill="#666666" text-anchor="middle">?</text>
            </svg>
          `);
        }
        
        const statusColor = isOnline ? '#10b981' : '#ef4444';
        
        // Fond gris
        ctx.fillStyle = '#cccccc';
        ctx.beginPath();
        ctx.arc(28, 28, 25, 0, 2 * Math.PI);
        ctx.fill();
        
        // Bordure blanche
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(28, 28, 25, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Texte "?"
        ctx.fillStyle = '#666666';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 28, 28);
        
        // Voyant de présence
        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(45, 45, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(45, 45, 8, 0, 2 * Math.PI);
        ctx.stroke();
        
        if (isOnline) {
          ctx.fillStyle = statusColor;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(45, 45, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
        
        return canvas.toDataURL();
      };

      // Créer le marqueur avec icône temporaire, puis mettre à jour avec l'image réelle
      const tempIcon = {
        url: defaultIcon(profile.isOnline || false),
        scaledSize: new google.maps.Size(56, 56),
        anchor: new google.maps.Point(28, 56),
      };

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: `${profile.firstName}, ${getAge(profile.dateOfBirth)} - ${profile.isOnline ? 'En ligne' : 'Hors ligne'}`,
        icon: tempIcon,
        optimized: false,
      });

      // Charger l'image réelle et mettre à jour l'icône
      if (photoUrl && photoUrl !== 'https://via.placeholder.com/50x50?text=Photo') {
        createCircularIconWithStatus(photoUrl, profile.isOnline || false, (iconUrl) => {
          marker.setIcon({
            url: iconUrl,
            scaledSize: new google.maps.Size(56, 56),
            anchor: new google.maps.Point(28, 56),
          });
        });
      }

      (window as any).selectProfileFromMap = (profileId: string) => {
        const profile = filteredProfiles.find((p) => p.id === profileId);
        if (profile) {
          setSelectedProfile(profile);
          setShowProfileModal(true);
        }
      };

      marker.addListener('click', () => {
        setSelectedProfile(profile);
        setShowProfileModal(true);
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, [filteredProfiles]);

  // Fonction pour filtrer par nom
  const applyNameFilter = (profiles: User[], nameQuery: string) => {
    if (!nameQuery || nameQuery.trim() === '') {
      setFilteredProfiles(profiles);
      return;
    }
    
    const query = nameQuery.toLowerCase().trim();
    const filtered = profiles.filter((profile) => {
      const firstName = (profile.firstName || '').toLowerCase();
      const lastName = (profile.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      return firstName.includes(query) || lastName.includes(query) || fullName.includes(query);
    });
    
    setFilteredProfiles(filtered);
  };

  // Effet pour filtrer dynamiquement quand la recherche change
  useEffect(() => {
    if (allProfiles.length > 0) {
      applyNameFilter(allProfiles, searchName);
    }
  }, [searchName]);

  // Initialiser la carte - vérifier périodiquement si tout est prêt
  useEffect(() => {
    if (mapInstanceRef.current) {
      console.log('Map already initialized, skipping');
      return; // Carte déjà initialisée
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 40; // 20 secondes max (40 * 500ms)

    const checkAndInit = () => {
      attempts++;
      // Log seulement tous les 5 essais pour éviter la verbosité
      if (attempts % 5 === 0 || attempts === 1) {
        console.log(`Map initialization attempt ${attempts}/${MAX_ATTEMPTS}`);
      }
      
      // Vérifier que mapRef est disponible
      if (!mapRef.current) {
        if (attempts < MAX_ATTEMPTS) {
          return; // Continuer à essayer
        } else {
          console.warn('mapRef not available after max attempts');
          if (intervalId) clearInterval(intervalId);
          setMapLoaded(true); // Masquer le spinner même si la carte n'est pas initialisée
          return;
        }
      }

      // Vérifier que Google Maps est chargé
      const google = (window as any).google;
      if (!google || !google.maps) {
        if (attempts < MAX_ATTEMPTS) {
          return; // Continuer à essayer
        } else {
          console.warn('Google Maps not loaded after max attempts');
          if (intervalId) clearInterval(intervalId);
          setMapLoaded(true); // Masquer le spinner même si la carte n'est pas initialisée
          toast.error('Impossible de charger Google Maps. Vérifiez votre connexion internet et la clé API.');
          return;
        }
      }

      // Tout est prêt, initialiser
      if (!mapInstanceRef.current && !initializingMapRef.current) {
        console.log('All conditions met, initializing map');
        initializeMapNow();
        if (intervalId) clearInterval(intervalId);
      }
    };

    // Timeout de sécurité : après 15 secondes, masquer le spinner même si la carte n'est pas initialisée
    timeoutId = setTimeout(() => {
      console.warn('Map initialization timeout - hiding spinner');
      setMapLoaded(true);
      if (intervalId) clearInterval(intervalId);
    }, 15000);

    // Démarrer immédiatement
    checkAndInit();

    // Vérifier périodiquement toutes les 500ms
    intervalId = setInterval(checkAndInit, 500);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // Une seule fois au montage

  // Mettre à jour le centre et les marqueurs quand les profils changent
  useEffect(() => {
    // Si la carte n'est pas encore initialisée, attendre un peu et réessayer
    if (!mapInstanceRef.current) {
      console.log('Map instance not ready yet, will retry when map is initialized');
      // Si on a des profils mais pas de carte, attendre un peu pour que la carte s'initialise
      if (filteredProfiles.length > 0) {
        const retryTimeout = setTimeout(() => {
          if (mapInstanceRef.current) {
            console.log('Map is now ready, updating markers');
            // Réexécuter la logique de mise à jour
            const center = selectedCity && CITY_REGION_COORDS[selectedCity]
              ? CITY_REGION_COORDS[selectedCity]
              : CITY_REGION_COORDS['Abidjan'] || { lat: 5.3600, lng: -4.0083 };
            const zoom = selectedCity && CITY_REGION_COORDS[selectedCity] ? 11 : 8;
            mapInstanceRef.current.setCenter(center);
            mapInstanceRef.current.setZoom(zoom);
            addMarkersToMap();
          }
        }, 1000);
        return () => clearTimeout(retryTimeout);
      }
      return;
    }

    console.log('Updating markers for', filteredProfiles.length, 'profiles');

    // Déterminer un centre en fonction de la ville/région sélectionnée ou des profils
    let center = CITY_REGION_COORDS['Abidjan'] || { lat: 5.3600, lng: -4.0083 };
    let zoom = 8;

    // Si une ville/région est sélectionnée et connue, centrer sur cette ville/région
    if (selectedCity && CITY_REGION_COORDS[selectedCity]) {
      center = CITY_REGION_COORDS[selectedCity];
      zoom = 11;
      console.log('Centering map on selected city/region:', selectedCity, center);
    } else if (filteredProfiles.length > 0) {
      // Si des profils ont des coordonnées, calculer le centre moyen
      const profilesWithCoords = filteredProfiles.filter(
        (p) => p.location?.coordinates?.lat && p.location?.coordinates?.lng
      );
      
      if (profilesWithCoords.length > 0) {
        const avgLat = profilesWithCoords.reduce((sum, p) => sum + (p.location!.coordinates!.lat), 0) / profilesWithCoords.length;
        const avgLng = profilesWithCoords.reduce((sum, p) => sum + (p.location!.coordinates!.lng), 0) / profilesWithCoords.length;
        center = { lat: avgLat, lng: avgLng };
        zoom = 10;
        console.log('Centering map on average profile coordinates:', center);
      } else {
        // Sinon, essayer de centrer sur la première ville/région connue parmi les profils
        const profileWithKnownLocation = filteredProfiles.find((p) => {
          const cityKey = p.location?.city || p.location?.region;
          return cityKey && CITY_REGION_COORDS[cityKey];
        });

        if (profileWithKnownLocation) {
          const cityKey = profileWithKnownLocation.location?.city || profileWithKnownLocation.location?.region!;
          center = CITY_REGION_COORDS[cityKey] || center;
          zoom = 11;
          console.log('Centering map on profile city/region:', cityKey, center);
        }
      }
    }

    try {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(center);
        mapInstanceRef.current.setZoom(zoom);

        // Mettre à jour les marqueurs
        addMarkersToMap();
        
        // Ajuster la vue pour inclure tous les marqueurs si on en a
        setTimeout(() => {
          if (markersRef.current.length > 0 && mapInstanceRef.current) {
            const google = (window as any).google;
            if (google && google.maps) {
              const bounds = new google.maps.LatLngBounds();
              let hasValidPositions = false;
              
              markersRef.current.forEach((marker) => {
                if (marker && marker.getPosition) {
                  const pos = marker.getPosition();
                  if (pos) {
                    bounds.extend(pos);
                    hasValidPositions = true;
                  }
                }
              });
              
              if (hasValidPositions && !bounds.isEmpty()) {
                mapInstanceRef.current.fitBounds(bounds);
                // Limiter le zoom maximum
                const listener = google.maps.event.addListener(mapInstanceRef.current, 'bounds_changed', () => {
                  if (mapInstanceRef.current.getZoom() && mapInstanceRef.current.getZoom()! > 15) {
                    mapInstanceRef.current.setZoom(15);
                  }
                  google.maps.event.removeListener(listener);
                });
              }
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error updating map center/markers:', error);
    }
  }, [filteredProfiles, addMarkersToMap, selectedCity]);

  const loadAllProfiles = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Charger les profils avec les filtres d'âge par défaut pour optimiser
      const data = await userService.getAllUsers({
        ageMin: ageMin,
        ageMax: ageMax,
        // Le backend filtrera automatiquement par genre opposé
      });
      
      // Limiter à 100 profils maximum pour les performances
      const limitedData = (data || []).slice(0, 100);
      
      // Afficher d'abord les profils sans statistiques pour ne pas bloquer l'affichage
      setProfiles(limitedData);
      setAllProfiles(limitedData);
      // Appliquer le filtre de recherche par nom si présent
      applyNameFilter(limitedData, searchName);
      
      if (limitedData.length > 0) {
        toast.success(`${limitedData.length} profil(s) chargé(s)`);
      } else {
        toast('Aucun profil trouvé', { icon: 'ℹ️' });
      }
      
      // Charger les statistiques de manière asynchrone après l'affichage
      Promise.all(
        limitedData.map(async (profile) => {
          try {
            const stats = await userService.getUserStats(profile.id);
            return { profileId: profile.id, stats };
          } catch (error) {
            console.error(`Error loading stats for user ${profile.id}:`, error);
            return { profileId: profile.id, stats: { likes: 0, dislikes: 0 } };
          }
        })
      ).then((statsResults) => {
        // Mettre à jour les profils avec les statistiques
        const profilesWithStats = limitedData.map((profile) => {
          const statsResult = statsResults.find((s) => s.profileId === profile.id);
          return { ...profile, stats: statsResult?.stats || { likes: 0, dislikes: 0 } };
        });
        setProfiles(profilesWithStats);
        setAllProfiles(profilesWithStats);
        // Appliquer le filtre de recherche par nom si présent
        applyNameFilter(profilesWithStats, searchName);
      });
    } catch (error: any) {
      console.error('Error loading profiles:', error);
      toast.error('Erreur lors du chargement des profils');
      setProfiles([]);
      setAllProfiles([]);
      setFilteredProfiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = async () => {
    if (!user) return;

    setIsLoading(true);
    
    try {
      const filters: any = {
        ageMin,
        ageMax,
      };
      
      // Ville : chercher par ville OU région
      if (selectedCity) {
        // Le backend recherchera automatiquement par city OU region si les deux sont fournis
        // On envoie la même valeur pour les deux pour permettre la recherche OR
        filters.city = selectedCity;
        filters.region = selectedCity;
      }
      
      // Commune : chercher par commune OU quartier
      if (selectedCommune) {
        // Le backend recherchera automatiquement par commune OU quartier si les deux sont fournis
        filters.commune = selectedCommune;
        filters.quartier = selectedCommune;
      }

      // Utiliser les coordonnées de la ville/région sélectionnée pour filtrer par distance
      // Si une ville/région est sélectionnée et connue, utiliser ses coordonnées pour la recherche géographique
      if (selectedCity) {
        const cityCoords = CITY_REGION_COORDS[selectedCity];
        if (cityCoords) {
          filters.centerLat = cityCoords.lat;
          filters.centerLng = cityCoords.lng;
          // Rayon raisonnable autour de la ville/région (en km)
          // Augmenté à 100km pour couvrir une région entière
          filters.radiusKm = 100;
        } else {
          // Si la ville n'a pas de coordonnées définies, utiliser un centre par défaut (Abidjan)
          filters.centerLat = CITY_REGION_COORDS['Abidjan'].lat;
          filters.centerLng = CITY_REGION_COORDS['Abidjan'].lng;
          filters.radiusKm = 100;
        }
      }
      // Si aucune ville n'est sélectionnée, ne pas filtrer par coordonnées (afficher tous les profils)

      // Toujours recharger depuis le backend pour avoir les résultats filtrés correctement
      const data = await userService.getAllUsers(filters);
      const limitedData = (data || []).slice(0, 100);
      
      // Afficher d'abord les profils sans statistiques pour ne pas bloquer l'affichage
      setProfiles(limitedData);
      setAllProfiles(limitedData);
      // Appliquer le filtre de recherche par nom si présent
      applyNameFilter(limitedData, searchName);
      
      // Charger les statistiques de manière asynchrone après l'affichage
      Promise.all(
        limitedData.map(async (profile) => {
          try {
            const stats = await userService.getUserStats(profile.id);
            return { profileId: profile.id, stats };
          } catch (error) {
            console.error(`Error loading stats for user ${profile.id}:`, error);
            return { profileId: profile.id, stats: { likes: 0, dislikes: 0 } };
          }
        })
      ).then((statsResults) => {
        // Mettre à jour les profils avec les statistiques
        const profilesWithStats = limitedData.map((profile) => {
          const statsResult = statsResults.find((s) => s.profileId === profile.id);
          return { ...profile, stats: statsResult?.stats || { likes: 0, dislikes: 0 } };
        });
        setProfiles(profilesWithStats);
        setAllProfiles(profilesWithStats);
        // Appliquer le filtre de recherche par nom si présent
        applyNameFilter(profilesWithStats, searchName);
      });
      
      if (limitedData.length === 0) {
        toast('Aucun profil trouvé avec ces critères', { icon: 'ℹ️' });
      } else {
        toast.success(`${limitedData.length} profil(s) trouvé(s)`);
      }
      
      // Note: Les statistiques seront chargées de manière asynchrone et mises à jour automatiquement
    } catch (error: any) {
      console.error('Error applying filters:', error);
      toast.error('Erreur lors de l\'application des filtres');
    } finally {
      setIsLoading(false);
    }
  };


  const loadGoogleMapsScript = () => {
    // Vérifier si le script est déjà chargé
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script déjà chargé, vérifier si l'API est disponible
      if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
        // API déjà disponible, déclencher l'initialisation après un court délai
        setTimeout(() => {
          if (mapRef.current && !mapInstanceRef.current && !initializingMapRef.current) {
            initializeMapNow();
          }
        }, 200);
      }
      // Si l'API n'est pas encore disponible, le callback ou l'intervalle s'en chargera
      return;
    }

    // Créer et charger le script
    const script = document.createElement('script');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    
    if (!apiKey) {
      console.warn('Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file');
      const errorMessage = 'Clé API Google Maps manquante. Ajoutez VITE_GOOGLE_MAPS_API_KEY dans votre fichier .env. Voir QUICK_START.md pour plus d\'informations.';
      toast.error(errorMessage, { duration: 6000 });
      console.error('Pour obtenir une clé API Google Maps :');
      console.error('1. Allez sur https://console.cloud.google.com/');
      console.error('2. Créez un projet ou sélectionnez-en un existant');
      console.error('3. Activez l\'API "Maps JavaScript API"');
      console.error('4. Créez des identifiants (clé API)');
      console.error('5. Ajoutez la clé dans votre fichier .env comme VITE_GOOGLE_MAPS_API_KEY=votre_cle_ici');
      setMapLoaded(true);
      return;
    }

    // Fonction de callback pour quand le script est chargé
    // Utiliser un nom unique pour éviter les conflits
    const callbackName = `initGoogleMapsCallback_${Date.now()}`;
    (window as any)[callbackName] = () => {
      console.log('Google Maps API loaded via callback');
      // Nettoyer la fonction callback après utilisation
      delete (window as any)[callbackName];
      // Attendre un peu pour s'assurer que tout est prêt
      setTimeout(() => {
        if (mapRef.current && !mapInstanceRef.current && !initializingMapRef.current) {
          initializeMapNow();
        }
      }, 300);
    };

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    script.onerror = (error) => {
      console.error('Failed to load Google Maps script:', error);
      toast.error('Erreur lors du chargement de Google Maps. Vérifiez votre connexion internet et la clé API.');
      setMapLoaded(true);
      // Nettoyer le callback en cas d'erreur
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
      }
    };

    script.onload = () => {
      console.log('Google Maps script loaded successfully');
    };

    document.head.appendChild(script);
  };

  // Fonction pour initialiser la carte immédiatement
  const initializeMapNow = () => {
    if (!mapRef.current) {
      console.warn('mapRef.current is null, cannot initialize map');
      setMapLoaded(true);
      return;
    }

    if (mapInstanceRef.current) {
      console.log('Map already initialized');
      setMapLoaded(true);
      return;
    }

    if (initializingMapRef.current) {
      console.log('Map initialization already in progress');
      return;
    }

    const google = (window as any).google;
    if (!google || !google.maps) {
      console.warn('Google Maps not available yet');
      setMapLoaded(true);
      return;
    }

    initializingMapRef.current = true;

    try {
      // Déterminer le centre par défaut
      let defaultCenter = CITY_REGION_COORDS['Abidjan'] || { lat: 5.3600, lng: -4.0083 };
      let defaultZoom = 8;

      // Si une ville/région est sélectionnée, utiliser ses coordonnées
      if (selectedCity && CITY_REGION_COORDS[selectedCity]) {
        defaultCenter = CITY_REGION_COORDS[selectedCity];
        defaultZoom = 11;
      }
      
      console.log('Initializing map now with center:', defaultCenter, 'zoom:', defaultZoom);
      
      // Vérifier une dernière fois que mapRef.current existe
      if (!mapRef.current) {
        console.error('mapRef.current became null before initialization');
        setMapLoaded(true);
        initializingMapRef.current = false;
        return;
      }
      
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      console.log('Map initialized successfully, instance:', mapInstanceRef.current);
      setMapLoaded(true);
      initializingMapRef.current = false;

      // Ajouter les marqueurs après un court délai pour s'assurer que la carte est complètement rendue
      setTimeout(() => {
        if (filteredProfiles.length > 0 && mapInstanceRef.current) {
          console.log('Adding initial markers after map initialization');
          addMarkersToMap();
          
          // Ajuster la vue pour inclure tous les marqueurs
          if (markersRef.current.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            markersRef.current.forEach((marker) => {
              if (marker && marker.getPosition) {
                const pos = marker.getPosition();
                if (pos) bounds.extend(pos);
              }
            });
            
            // Si on a des marqueurs, ajuster la vue
            if (!bounds.isEmpty()) {
              mapInstanceRef.current.fitBounds(bounds);
              // Limiter le zoom maximum pour éviter un zoom trop serré
              const listener = google.maps.event.addListener(mapInstanceRef.current, 'bounds_changed', () => {
                if (mapInstanceRef.current.getZoom() && mapInstanceRef.current.getZoom()! > 15) {
                  mapInstanceRef.current.setZoom(15);
                }
                google.maps.event.removeListener(listener);
              });
            }
          }
        }
      }, 800);
    } catch (error: any) {
      console.error('Error initializing map:', error);
      console.error('Error details:', error.message, error.stack);
      // Toujours masquer le spinner même en cas d'erreur
      setMapLoaded(true);
      initializingMapRef.current = false;
      toast.error('Erreur lors de l\'initialisation de la carte: ' + (error.message || 'Erreur inconnue'));
    }
  };

  const handleSwipe = async (direction: 'left' | 'right' | 'up') => {
    if (!selectedProfile || !user) return;

    // Si déjà matché, ne pas permettre les actions
    if (matchedUserIds.has(selectedProfile.id)) {
      toast('Ce profil a déjà matché avec vous', { icon: 'ℹ️' });
      return;
    }

    const action = direction === 'right' ? 'like' : direction === 'up' ? 'superlike' : 'dislike';

    try {
      const result = await userService.swipe(selectedProfile.id, action);
      
      if (result.matched && direction === 'right') {
        toast.success('🎉 Nouveau match !');
        // Recharger les matchs pour mettre à jour l'état
        await reloadMatches();
      } else {
        toast.success(direction === 'left' ? 'Profil rejeté' : 'Profil liké');
      }

      // Retirer le profil de la liste filtrée
      setFilteredProfiles((prev) => prev.filter((p) => p.id !== selectedProfile.id));
      setShowProfileModal(false);
      setSelectedProfile(null);
    } catch (error: any) {
      console.error('Error during swipe:', error);
      // Si l'erreur indique que le swipe a déjà été fait, c'est OK, on peut continuer
      if (error.response?.status === 400 && error.response?.data?.message?.includes('déjà')) {
        toast('Action déjà effectuée', { icon: 'ℹ️' });
        setShowProfileModal(false);
        setSelectedProfile(null);
      } else {
        toast.error('Erreur lors du swipe');
      }
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">Veuillez vous connecter</p>
          <p className="text-gray-400 text-sm">Vous devez être connecté pour accéder à la recherche avancée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Recherche avancée</h1>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-primary-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Filtres de recherche</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ville ou Région
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Toutes les villes/régions</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Recherche par ville ou région
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commune ou Quartier
            </label>
            <select
              value={selectedCommune}
              onChange={(e) => setSelectedCommune(e.target.value)}
              disabled={!selectedCity}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                !selectedCity ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">
                {selectedCity ? 'Toutes les communes/quartiers' : 'Sélectionnez d\'abord une ville/région'}
              </option>
              {availableCommunes.map((commune) => (
                <option key={commune} value={commune}>
                  {commune}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Recherche par commune ou quartier
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Âge minimum
            </label>
            <Input
              type="number"
              min="18"
              max="99"
              value={ageMin.toString()}
              onChange={(e) => setAgeMin(parseInt(e.target.value) || 18)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Âge maximum
            </label>
            <Input
              type="number"
              min="18"
              max="99"
              value={ageMax.toString()}
              onChange={(e) => setAgeMax(parseInt(e.target.value) || 99)}
            />
          </div>
        </div>

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recherche par nom
          </label>

          {/* Ligne unique: input + bouton avec même hauteur => textes parfaitement alignés */}
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <input
              type="text"
              placeholder="Tapez le nom de l'utilisateur..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="input h-12 py-2"
            />

            <Button
              onClick={applyFilters}
              variant="primary"
              className="w-full md:w-auto h-12 inline-flex items-center justify-center"
            >
              <IoSearch className="mr-2" size={20} />
              Rechercher
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-1">
            Recherche dynamique par prénom ou nom
          </p>
        </div>
      </div>

      {/* Carte */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-primary-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Résultats ({filteredProfiles.length} profil{filteredProfiles.length > 1 ? 's' : ''})
          </h2>
          {filteredProfiles.length > 0 && (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>En ligne</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Hors ligne</span>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <div
            ref={mapRef}
            className="w-full h-[600px] rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100"
            style={{ minHeight: '600px' }}
          />
          {/* Spinner de chargement de la carte initiale */}
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement de la carte...</p>
                <p className="text-xs text-gray-500 mt-2">
                  {filteredProfiles.length > 0 ? `${filteredProfiles.length} profil(s) trouvé(s)` : ''}
                </p>
              </div>
            </div>
          )}
          {/* Spinner de rafraîchissement lors de la recherche */}
          {isLoading && mapLoaded && mapInstanceRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-20 backdrop-blur-sm">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Recherche en cours...</p>
                <p className="text-xs text-gray-500 mt-2">Actualisation de la carte</p>
              </div>
            </div>
          )}
          {/* Message si la carte n'est pas disponible */}
          {mapLoaded && !mapInstanceRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-10 pointer-events-none">
              <div className="text-center">
                <IoLocationOutline size={64} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Carte non disponible</p>
                <p className="text-gray-500 text-sm mt-2">
                  Vérifiez votre connexion internet et la clé API Google Maps
                </p>
              </div>
            </div>
          )}
          {/* Message si aucun profil trouvé */}
          {mapLoaded && mapInstanceRef.current && filteredProfiles.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-10 pointer-events-none">
              <div className="text-center">
                <IoLocationOutline size={64} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Aucun profil trouvé</p>
                <p className="text-gray-500 text-sm mt-2">
                  Ajustez vos filtres et réessayez
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Liste des profils trouvés - toujours affichée en dessous de la carte */}
        {filteredProfiles.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Profils trouvés (vue liste) - {filteredProfiles.length} profil{filteredProfiles.length > 1 ? 's' : ''}
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {filteredProfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProfile(p);
                        setShowProfileModal(true);
                      }}
                      className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 flex items-center transition-colors relative min-h-[80px]"
                    >
                      {/* Section gauche : Photo + Informations */}
                      <div className="flex items-center space-x-3 flex-1">
                        {p.photos && p.photos.length > 0 ? (
                          <img
                            src={p.photos[0].startsWith('http') 
                              ? p.photos[0] 
                              : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${p.photos[0]}`
                            }
                            alt={p.firstName}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48x48?text=Photo';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 text-xs">Photo</span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {p.firstName}, {getAge(p.dateOfBirth)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.location?.city || p.location?.region || 'Ville inconnue'}
                            {p.location?.commune ? ` • ${p.location.commune}` : ''}
                            {p.location?.quartier ? ` • ${p.location.quartier}` : ''}
                          </p>
                        </div>
                      </div>
                      
                      {/* Section droite : Icône cœur avec "Déjà matché" (si matché) + Voyant de présence */}
                      <div className="flex items-center space-x-3 ml-auto">
                        {/* Icône cœur avec "Déjà matché" si matché - rapproché du voyant */}
                        {matchedUserIds.has(p.id) && (
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F26E27] border-2 border-[#12C43F]">
                              <IoHeart size={18} className="text-white" />
                            </div>
                            <span className="text-xs text-gray-500 italic">Déjà matché</span>
                          </div>
                        )}
                        
                        {/* Voyant de présence en ligne - toujours à l'extrême droite */}
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              p.isOnline ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            title={p.isOnline ? 'En ligne' : 'Hors ligne'}
                          />
                          <span className="text-xs text-gray-500">
                            {p.isOnline ? 'En ligne' : 'Hors ligne'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de profil */}
      {showProfileModal && selectedProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => {
              setShowProfileModal(false);
              setSelectedProfile(null);
            }}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all"
              style={{ height: '450px', minHeight: '450px', maxHeight: '450px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-full overflow-hidden">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setSelectedProfile(null);
                  }}
                  className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <IoClose size={24} className="text-gray-700" />
                </button>
                <div className="h-full">
                  <ProfileCard
                    user={selectedProfile}
                    onSwipe={handleSwipe}
                    onSwipeComplete={() => {
                      setShowProfileModal(false);
                      setSelectedProfile(null);
                    }}
                    showStats={true}
                    hideSuperlike={true}
                    isMatched={matchedUserIds.has(selectedProfile.id)}
                    customHeight="450px"
                    customPhotoHeight="250px"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

