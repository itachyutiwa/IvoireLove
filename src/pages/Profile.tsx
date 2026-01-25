import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/userService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IoCamera, IoTrash, IoCheckmark, IoClose, IoLocation, IoLocationOutline } from 'react-icons/io5';
import { getAge } from '@/utils/helpers';
import toast from 'react-hot-toast';
import { AFRICAN_COUNTRIES, LOCATIONS_BY_COUNTRY } from '@/utils/locations';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { subscription } = useSubscription();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    dateOfBirth: user?.dateOfBirth || '',
    phone: user?.phone || '',
    location: {
      region: user?.location?.region || '',
      commune: user?.location?.commune || '',
      city: user?.location?.city || '',
      quartier: user?.location?.quartier || '',
      country: user?.location?.country || '',
      coordinates: user?.location?.coordinates,
    },
  });
  const [preferences, setPreferences] = useState({
    ageRange: {
      min: user?.preferences?.ageRange?.min || 18,
      max: user?.preferences?.ageRange?.max || 99,
    },
    maxDistance: user?.preferences?.maxDistance || 50,
    interestedIn: user?.preferences?.interestedIn || [],
  });
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Mettre à jour les données quand l'utilisateur change
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        dateOfBirth: user.dateOfBirth || '',
        phone: user.phone || '',
        location: {
          region: user.location?.region || '',
          commune: user.location?.commune || '',
          city: user.location?.city || '',
          quartier: user.location?.quartier || '',
          country: user.location?.country || '',
          coordinates: user.location?.coordinates,
        },
      });
      setPhotos(user.photos || []);
      setPreferences({
        ageRange: {
          min: user.preferences?.ageRange?.min || 18,
          max: user.preferences?.ageRange?.max || 99,
        },
        maxDistance: user.preferences?.maxDistance || 50,
        interestedIn: user.preferences?.interestedIn || [],
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const updatedUser = await userService.updateProfile({
        ...formData,
        preferences,
      });
      updateUser(updatedUser);
      // Mettre à jour les photos aussi
      setPhotos(updatedUser.photos || []);
      setIsEditing(false);
      toast.success('Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image doit faire moins de 5MB');
      return;
    }

    try {
      const photoUrl = await userService.uploadPhoto(file);
      const newPhotos = [...photos, photoUrl];
      setPhotos(newPhotos);
      
      // Mettre à jour le store avec les nouvelles photos
      if (user) {
        updateUser({ ...user, photos: newPhotos });
      }
      
      toast.success('Photo ajoutée avec succès');
      // Réinitialiser l'input pour permettre de re-uploader la même photo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'upload');
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    try {
      await userService.deletePhoto(photoUrl);
      const newPhotos = photos.filter((p) => p !== photoUrl);
      setPhotos(newPhotos);
      
      // Mettre à jour le store
      if (user) {
        updateUser({ ...user, photos: newPhotos });
      }
      
      toast.success('Photo supprimée');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  if (!user) {
    return <div>Chargement...</div>;
  }

  // Photo de profil principale
  const mainPhoto = photos.length > 0 
    ? (photos[0].startsWith('http') 
        ? photos[0] 
        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${photos[0]}`)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Carte attrayante avec photo de profil et informations */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-400 to-secondary-500 rounded-2xl shadow-xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Photo de profil circulaire ou bouton ajouter en mode édition */}
          <div className="flex-shrink-0">
            {isEditing && (!mainPhoto || photos.length === 0) ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-full bg-white bg-opacity-20 border-4 border-white border-dashed shadow-lg flex flex-col items-center justify-center hover:bg-opacity-30 transition-all cursor-pointer"
              >
                <IoCamera size={32} className="text-white mb-1" />
                <span className="text-xs text-white text-center px-2">Ajouter une photo</span>
              </button>
            ) : mainPhoto ? (
              <div className="relative group">
                <img
                  src={mainPhoto}
                  alt={`${formData.firstName} ${formData.lastName}`}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128x128?text=Photo';
                  }}
                />
                {isEditing && (
                  <button
                    onClick={() => handleDeletePhoto(photos[0])}
                    className="absolute -top-1 -right-1 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Supprimer la photo"
                  >
                    <IoTrash size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-white bg-opacity-20 border-4 border-white shadow-lg flex items-center justify-center">
                <IoCamera size={48} className="text-white opacity-50" />
              </div>
            )}
          </div>
          
          {/* Informations utilisateur */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-bold">
                {formData.firstName} {formData.lastName}
              </h1>
              {subscription && subscription.isActive && (
                <SubscriptionBadge type={subscription.type} size="md" />
              )}
            </div>
            {formData.dateOfBirth && (
              <p className="text-lg text-white text-opacity-90 mb-2">
                {getAge(formData.dateOfBirth)} ans
              </p>
            )}
            {(formData.location?.city || formData.location?.quartier) && (
              <div className="flex items-center justify-center md:justify-start gap-2 text-white text-opacity-90">
                <IoLocationOutline size={20} />
                <span>
                  {formData.location.quartier && `${formData.location.quartier}, `}
                  {formData.location.city || 'Ville non renseignée'}
                </span>
              </div>
            )}
          </div>

          {/* Bouton Modifier */}
          <div className="flex-shrink-0">
            {!isEditing ? (
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                className="bg-white text-primary-600 hover:bg-gray-100 border-white"
              >
                Modifier
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      firstName: user.firstName || '',
                      lastName: user.lastName || '',
                      bio: user.bio || '',
                      dateOfBirth: user.dateOfBirth || '',
                      phone: user.phone || '',
                      location: {
                        region: user.location?.region || '',
                        commune: user.location?.commune || '',
                        city: user.location?.city || '',
                        quartier: user.location?.quartier || '',
                        country: user.location?.country || '',
                        coordinates: user.location?.coordinates,
                      },
                    });
                    setPreferences({
                      ageRange: {
                        min: user.preferences?.ageRange?.min || 18,
                        max: user.preferences?.ageRange?.max || 99,
                      },
                      maxDistance: user.preferences?.maxDistance || 50,
                      interestedIn: user.preferences?.interestedIn || [],
                    });
                  }}
                  className="bg-red-600 text-white border-2 border-white shadow-lg hover:bg-red-700 font-semibold flex items-center justify-center"
                >
                  <IoClose size={18} className="mr-1" />
                  Annuler
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSave}
                  className="bg-green-600 text-white border-2 border-white shadow-lg hover:bg-green-700 font-semibold flex items-center justify-center"
                >
                  <IoCheckmark size={18} className="mr-1" />
                  Enregistrer
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Input file pour les photos (caché) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Informations du profil</h2>
        </div>

        {/* Informations */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prénom"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Nom"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <Input
            label="Date de naissance"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            disabled={!isEditing}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              disabled={!isEditing}
              rows={4}
              className="input resize-none"
              placeholder="Parlez-nous de vous..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Genre
            </label>
            <div className="px-4 py-3 rounded-lg border border-gray-300 bg-gray-50">
              {user.gender === 'male' ? 'Homme' : 'Femme'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <div className="px-4 py-3 rounded-lg border border-gray-300 bg-gray-50">
              {user.email}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Numéro de téléphone
            </label>
            {isEditing ? (
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
            ) : (
              <div className="px-4 py-3 rounded-lg border border-gray-300 bg-gray-50">
                {user.phone || 'Non renseigné'}
              </div>
            )}
          </div>

          {/* Localisation géographique */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Localisation géographique
            </label>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Pays
                  </label>
                  <select
                    value={formData.location.country}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      setFormData({
                        ...formData,
                        location: { 
                          ...formData.location, 
                          country: newCountry,
                          region: '', // Réinitialiser les champs dépendants
                          city: '',
                          commune: '',
                          quartier: '',
                        },
                      });
                    }}
                    className="input w-full"
                  >
                    <option value="">Sélectionnez un pays</option>
                    {AFRICAN_COUNTRIES.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {formData.location.country && LOCATIONS_BY_COUNTRY[formData.location.country] && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Région
                      </label>
                      <select
                        value={formData.location.region}
                        onChange={(e) => {
                          const newRegion = e.target.value;
                          setFormData({
                            ...formData,
                            location: { 
                              ...formData.location, 
                              region: newRegion,
                              city: '', // Réinitialiser les champs dépendants
                              commune: '',
                              quartier: '',
                            },
                          });
                        }}
                        className="input w-full"
                      >
                        <option value="">Sélectionnez une région</option>
                        {Object.keys(LOCATIONS_BY_COUNTRY[formData.location.country].regions).map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {formData.location.region && LOCATIONS_BY_COUNTRY[formData.location.country]?.regions[formData.location.region] && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Ville
                        </label>
                        <select
                          value={formData.location.city}
                          onChange={(e) => {
                            const newCity = e.target.value;
                            setFormData({
                              ...formData,
                              location: { 
                                ...formData.location, 
                                city: newCity,
                                commune: '', // Réinitialiser les champs dépendants
                                quartier: '',
                              },
                            });
                          }}
                          className="input w-full"
                        >
                          <option value="">Sélectionnez une ville</option>
                          {Object.keys(LOCATIONS_BY_COUNTRY[formData.location.country].regions[formData.location.region].cities).map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {formData.location.city && LOCATIONS_BY_COUNTRY[formData.location.country]?.regions[formData.location.region]?.cities[formData.location.city] && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Commune
                          </label>
                          <select
                            value={formData.location.commune}
                            onChange={(e) => {
                              const newCommune = e.target.value;
                              setFormData({
                                ...formData,
                                location: { 
                                  ...formData.location, 
                                  commune: newCommune,
                                  quartier: '', // Réinitialiser le quartier
                                },
                              });
                            }}
                            className="input w-full"
                          >
                            <option value="">Sélectionnez une commune</option>
                            {LOCATIONS_BY_COUNTRY[formData.location.country].regions[formData.location.region].cities[formData.location.city].communes.map((commune) => (
                              <option key={commune} value={commune}>
                                {commune}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Quartier
                          </label>
                          <select
                            value={formData.location.quartier}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                location: { ...formData.location, quartier: e.target.value },
                              });
                            }}
                            className="input w-full"
                          >
                            <option value="">Sélectionnez un quartier</option>
                            {LOCATIONS_BY_COUNTRY[formData.location.country].regions[formData.location.region].cities[formData.location.city].quartiers.map((quartier) => (
                              <option key={quartier} value={quartier}>
                                {quartier}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </>
                )}
                
                {/* Fallback si le pays n'est pas dans la liste ou si pas de données */}
                {formData.location.country && !LOCATIONS_BY_COUNTRY[formData.location.country] && (
                  <div className="text-sm text-gray-500 italic">
                    Les données de localisation pour ce pays seront bientôt disponibles. Vous pouvez utiliser les champs ci-dessous.
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setFormData({
                            ...formData,
                            location: {
                              ...formData.location,
                              coordinates: {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                              },
                            },
                          });
                          toast.success('Position GPS enregistrée');
                        },
                        (_error) => {
                          toast.error('Erreur lors de la récupération de la position');
                        }
                      );
                    } else {
                      toast.error('La géolocalisation n\'est pas disponible');
                    }
                  }}
                >
                  <IoLocation className="mr-2" size={18} />
                  Utiliser ma position GPS
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.location.region && (
                  <div className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-50">
                    <span className="text-sm text-gray-600">Région: </span>
                    <span className="text-gray-900">{formData.location.region}</span>
                  </div>
                )}
                {formData.location.commune && (
                  <div className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-50">
                    <span className="text-sm text-gray-600">Commune: </span>
                    <span className="text-gray-900">{formData.location.commune}</span>
                  </div>
                )}
                {formData.location.city && (
                  <div className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-50">
                    <span className="text-sm text-gray-600">Ville: </span>
                    <span className="text-gray-900">{formData.location.city}</span>
                  </div>
                )}
                {formData.location.quartier && (
                  <div className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-50">
                    <span className="text-sm text-gray-600">Quartier: </span>
                    <span className="text-gray-900">{formData.location.quartier}</span>
                  </div>
                )}
                {formData.location.country && (
                  <div className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-50">
                    <span className="text-sm text-gray-600">Pays: </span>
                    <span className="text-gray-900">{formData.location.country}</span>
                  </div>
                )}
                {!formData.location.region && !formData.location.commune && !formData.location.city && !formData.location.quartier && (
                  <div className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500">
                    Aucune localisation renseignée
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Préférences */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Préférences</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tranche d'âge recherchée
            </label>
            {isEditing ? (
              <div className="flex items-center space-x-4">
                <Input
                  type="number"
                  value={preferences.ageRange.min}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    ageRange: { ...preferences.ageRange, min: parseInt(e.target.value) || 18 }
                  })}
                  className="w-24"
                />
                <span className="text-gray-600">-</span>
                <Input
                  type="number"
                  value={preferences.ageRange.max}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    ageRange: { ...preferences.ageRange, max: parseInt(e.target.value) || 99 }
                  })}
                  className="w-24"
                />
                <span className="text-gray-600">ans</span>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  {user.preferences.ageRange.min} - {user.preferences.ageRange.max} ans
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distance maximale
            </label>
            {isEditing ? (
              <div className="flex items-center space-x-4">
                <Input
                  type="number"
                  value={preferences.maxDistance}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    maxDistance: parseInt(e.target.value) || 50
                  })}
                  className="w-32"
                />
                <span className="text-gray-600">km</span>
              </div>
            ) : (
              <span className="text-gray-600">{user.preferences.maxDistance} km</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

