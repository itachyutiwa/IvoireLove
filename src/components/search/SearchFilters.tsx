import React, { useState } from 'react';
import { IoSearch, IoClose, IoLocation, IoMap } from 'react-icons/io5';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface SearchFiltersProps {
  filters: {
    ageMin?: number;
    ageMax?: number;
    region?: string;
    commune?: string;
    city?: string;
    quartier?: string;
    centerLat?: number;
    centerLng?: number;
    radiusKm?: number;
  };
  onFiltersChange: (filters: any) => void;
  onClose?: () => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState({
    ageMin: filters.ageMin || '',
    ageMax: filters.ageMax || '',
    region: filters.region || '',
    commune: filters.commune || '',
    city: filters.city || '',
    quartier: filters.quartier || '',
    radiusKm: filters.radiusKm || 50,
  });
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(
    filters.centerLat && filters.centerLng
      ? { lat: filters.centerLat, lng: filters.centerLng }
      : null
  );

  const handleApplyFilters = () => {
    const appliedFilters: any = {};
    
    if (localFilters.ageMin) appliedFilters.ageMin = parseInt(localFilters.ageMin.toString());
    if (localFilters.ageMax) appliedFilters.ageMax = parseInt(localFilters.ageMax.toString());
    if (localFilters.region) appliedFilters.region = localFilters.region;
    if (localFilters.commune) appliedFilters.commune = localFilters.commune;
    if (localFilters.city) appliedFilters.city = localFilters.city;
    if (localFilters.quartier) appliedFilters.quartier = localFilters.quartier;
    if (mapCenter) {
      appliedFilters.centerLat = mapCenter.lat;
      appliedFilters.centerLng = mapCenter.lng;
      appliedFilters.radiusKm = parseFloat(localFilters.radiusKm.toString());
    }

    onFiltersChange(appliedFilters);
    onClose?.();
  };

  const handleClearFilters = () => {
    setLocalFilters({
      ageMin: '',
      ageMax: '',
      region: '',
      commune: '',
      city: '',
      quartier: '',
      radiusKm: 50,
    });
    setMapCenter(null);
    onFiltersChange({});
    onClose?.();
  };

  const handleMapClick = (e: any) => {
    if (e.latLng) {
      setMapCenter({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <IoSearch className="mr-2 text-primary-600" size={20} />
          Filtres de recherche
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <IoClose size={20} />
          </button>
        )}
      </div>

      {/* Tranche d'âge */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tranche d'âge
        </label>
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            placeholder="Âge min"
            value={localFilters.ageMin}
            onChange={(e) =>
              setLocalFilters({ ...localFilters, ageMin: e.target.value ? parseInt(e.target.value) : '' })
            }
            min={18}
            max={99}
          />
          <Input
            type="number"
            placeholder="Âge max"
            value={localFilters.ageMax}
            onChange={(e) =>
              setLocalFilters({ ...localFilters, ageMax: e.target.value ? parseInt(e.target.value) : '' })
            }
            min={18}
            max={99}
          />
        </div>
      </div>

      {/* Zone géographique */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Zone géographique
        </label>
        <div className="space-y-3">
          <Input
            placeholder="Région"
            value={localFilters.region}
            onChange={(e) => setLocalFilters({ ...localFilters, region: e.target.value })}
          />
          <Input
            placeholder="Commune"
            value={localFilters.commune}
            onChange={(e) => setLocalFilters({ ...localFilters, commune: e.target.value })}
          />
          <Input
            placeholder="Ville"
            value={localFilters.city}
            onChange={(e) => setLocalFilters({ ...localFilters, city: e.target.value })}
          />
          <Input
            placeholder="Quartier"
            value={localFilters.quartier}
            onChange={(e) => setLocalFilters({ ...localFilters, quartier: e.target.value })}
          />
        </div>
      </div>

      {/* Recherche par carte */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recherche par carte (Google Maps)
        </label>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowMap(true)}
        >
          <IoMap className="mr-2" size={20} />
          {mapCenter ? 'Modifier la position' : 'Sélectionner sur la carte'}
        </Button>
        {mapCenter && (
          <div className="mt-2 text-sm text-gray-600">
            Position: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
          </div>
        )}
        {mapCenter && (
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rayon de recherche (km)
            </label>
            <Input
              type="number"
              value={localFilters.radiusKm}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, radiusKm: parseFloat(e.target.value) || 50 })
              }
              min={1}
              max={500}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-3 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleClearFilters}
        >
          Réinitialiser
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleApplyFilters}
        >
          Appliquer
        </Button>
      </div>

      {/* Modal Google Maps */}
      <Modal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        title="Sélectionner une position sur la carte"
        size="lg"
      >
        <div className="space-y-4">
          <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center relative">
            {/* Intégration Google Maps - nécessite une clé API */}
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=Abidjan,Côte+d'Ivoire&zoom=12`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded-lg"
            />
            <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg">
              <p className="text-sm text-gray-600 mb-2">
                Cliquez sur la carte pour sélectionner une position
              </p>
              <p className="text-xs text-gray-500">
                Note: Pour une intégration complète, une clé API Google Maps est requise
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                // En mode développement, utiliser une position par défaut (Abidjan)
                setMapCenter({ lat: 5.3600, lng: -4.0083 });
                setShowMap(false);
              }}
            >
              Utiliser Abidjan (développement)
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setMapCenter({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                      });
                      setShowMap(false);
                    },
                    (error) => {
                      console.error('Geolocation error:', error);
                      // Fallback vers Abidjan
                      setMapCenter({ lat: 5.3600, lng: -4.0083 });
                      setShowMap(false);
                    }
                  );
                } else {
                  // Fallback vers Abidjan
                  setMapCenter({ lat: 5.3600, lng: -4.0083 });
                  setShowMap(false);
                }
              }}
            >
              Utiliser ma position
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

