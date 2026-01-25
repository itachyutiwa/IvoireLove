import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { IoHeart, IoCheckmarkCircle } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { AFRICAN_COUNTRIES, LOCATIONS_BY_COUNTRY } from '@/utils/locations';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phone?: string;
  countryCode?: string;
  location?: {
    country: string;
    region: string;
    city: string;
    commune: string;
    quartier: string;
  };
}

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, verifyRegistration } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [userId, setUserId] = useState<string | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'phone' | 'email'>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [registerData, setRegisterData] = useState<RegisterForm | null>(null);
  const [countryCode, setCountryCode] = useState('CI');
  const [phoneValue, setPhoneValue] = useState('');
  const [location, setLocation] = useState({
    country: '',
    region: '',
    city: '',
    commune: '',
    quartier: '',
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      // Préparer les données avec le numéro de téléphone formaté
      const phoneData = phoneValue ? { phone: phoneValue, countryCode } : {};
      
      const registrationData = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        ...phoneData,
        location: location.country || location.region || location.city || location.commune || location.quartier ? {
          country: location.country,
          region: location.region,
          city: location.city,
          commune: location.commune,
          quartier: location.quartier,
        } : undefined,
      };

      // Sauvegarder les données pour la vérification
      setRegisterData({ ...data, phone: phoneValue, countryCode, location });

      // Enregistrer l'utilisateur (sans vérification)
      const response = await registerUser(registrationData);
      setUserId(response.userId);
      setVerificationMethod(response.verificationMethod);
      setStep('verify');
      toast.success(`Code de confirmation envoyé par ${response.verificationMethod === 'phone' ? 'SMS' : 'email'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Veuillez entrer un code de 6 chiffres');
      return;
    }

    if (!userId || !registerData) {
      toast.error('Erreur: données d\'inscription manquantes');
      return;
    }

    setIsVerifying(true);
    try {
      await verifyRegistration(
        userId,
        verificationCode,
        registerData.email,
        registerData.phone
      );
      toast.success('Inscription réussie ! Bienvenue sur IvoireLove !');
      navigate('/discover');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Code de vérification invalide');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!userId || !registerData) {
      toast.error('Erreur: données d\'inscription manquantes');
      return;
    }

    try {
      const response = await authService.resendVerificationCode(
        userId,
        registerData.email,
        registerData.phone
      );
      setVerificationMethod(response.verificationMethod);
      toast.success(`Code renvoyé par ${response.verificationMethod === 'phone' ? 'SMS' : 'email'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi du code');
    }
  };

  // Étape de vérification
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-primary-200">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-[#F26E27] via-[#FFFFFF] to-[#12C43F] p-3 rounded-full shadow-lg">
                  <IoCheckmarkCircle className="text-3xl" style={{ 
                    background: 'linear-gradient(to right, #F26E27, #FFFFFF, #12C43F)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: '#F26E27'
                  }} />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Vérification du compte
              </h1>
              <p className="text-gray-600">
                Nous avons envoyé un code de confirmation {verificationMethod === 'phone' ? 'par SMS' : 'par email'} de la part de <strong className="text-[#F26E27]">IvoireLove</strong>
              </p>
              {registerData && (
                <p className="text-sm text-gray-500 mt-2">
                  {verificationMethod === 'phone' 
                    ? `à ${registerData.phone}` 
                    : `à ${registerData.email}`}
                </p>
              )}
              {import.meta.env.DEV && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ Mode développement :</strong> Le code de confirmation est affiché dans la console du serveur backend. Vérifiez les logs du serveur pour voir le code.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code de confirmation (6 chiffres)
                </label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                  }}
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Entrez le code à 6 chiffres reçu
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={handleVerifyCode}
                isLoading={isVerifying}
                disabled={verificationCode.length !== 6}
              >
                Vérifier le code
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Renvoyer le code
                </button>
              </div>

              <div className="text-center pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setStep('register');
                    setVerificationCode('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  ← Retour à l'inscription
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Étape d'inscription
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-primary-200">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-[#F26E27] via-[#FFFFFF] to-[#12C43F] p-3 rounded-full shadow-lg">
                <IoHeart className="text-3xl" style={{ 
                  background: 'linear-gradient(to right, #F26E27, #FFFFFF, #12C43F)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: '#F26E27'
                }} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Créer un compte
            </h1>
            <p className="text-gray-600">
              Rejoignez IvoireLove et commencez votre essai gratuit
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                placeholder="Jean"
                {...register('firstName', {
                  required: 'Le prénom est requis',
                })}
                error={errors.firstName?.message}
              />
              <Input
                label="Nom"
                placeholder="Dupont"
                {...register('lastName', {
                  required: 'Le nom est requis',
                })}
                error={errors.lastName?.message}
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="votre@email.com"
              {...register('email', {
                required: 'L\'email est requis',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Email invalide',
                },
              })}
              error={errors.email?.message}
            />

            <Input
              label="Date de naissance"
              type="date"
              {...register('dateOfBirth', {
                required: 'La date de naissance est requise',
              })}
              error={errors.dateOfBirth?.message}
            />

            {/* Section Localisation géographique */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Localisation géographique</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Pays
                </label>
                <select
                  value={location.country}
                  onChange={(e) => {
                    const newCountry = e.target.value;
                    setLocation({
                      country: newCountry,
                      region: '',
                      city: '',
                      commune: '',
                      quartier: '',
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
              
              {location.country && LOCATIONS_BY_COUNTRY[location.country] && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Région
                    </label>
                    <select
                      value={location.region}
                      onChange={(e) => {
                        const newRegion = e.target.value;
                        setLocation({
                          ...location,
                          region: newRegion,
                          city: '',
                          commune: '',
                          quartier: '',
                        });
                      }}
                      className="input w-full"
                    >
                      <option value="">Sélectionnez une région</option>
                      {Object.keys(LOCATIONS_BY_COUNTRY[location.country].regions).map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {location.region && LOCATIONS_BY_COUNTRY[location.country]?.regions[location.region] && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Ville
                      </label>
                      <select
                        value={location.city}
                        onChange={(e) => {
                          const newCity = e.target.value;
                          setLocation({
                            ...location,
                            city: newCity,
                            commune: '',
                            quartier: '',
                          });
                        }}
                        className="input w-full"
                      >
                        <option value="">Sélectionnez une ville</option>
                        {Object.keys(LOCATIONS_BY_COUNTRY[location.country].regions[location.region].cities).map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {location.city && LOCATIONS_BY_COUNTRY[location.country]?.regions[location.region]?.cities[location.city] && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Commune
                        </label>
                        <select
                          value={location.commune}
                          onChange={(e) => {
                            const newCommune = e.target.value;
                            setLocation({
                              ...location,
                              commune: newCommune,
                              quartier: '',
                            });
                          }}
                          className="input w-full"
                        >
                          <option value="">Sélectionnez une commune</option>
                          {LOCATIONS_BY_COUNTRY[location.country].regions[location.region].cities[location.city].communes.map((commune) => (
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
                          value={location.quartier}
                          onChange={(e) => {
                            setLocation({
                              ...location,
                              quartier: e.target.value,
                            });
                          }}
                          className="input w-full"
                        >
                          <option value="">Sélectionnez un quartier</option>
                          {LOCATIONS_BY_COUNTRY[location.country].regions[location.region].cities[location.city].quartiers.map((quartier) => (
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
              
              {location.country && !LOCATIONS_BY_COUNTRY[location.country] && (
                <div className="text-sm text-gray-500 italic">
                  Les données de localisation pour ce pays seront bientôt disponibles.
                </div>
              )}
            </div>

            <PhoneInput
              label="Numéro de téléphone (optionnel)"
              value={phoneValue}
              onChange={(value, code) => {
                setPhoneValue(value);
                setCountryCode(code);
              }}
              countryCode={countryCode}
              error={errors.phone?.message}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genre
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors">
                  <input
                    type="radio"
                    value="male"
                    {...register('gender', { required: true })}
                    className="mr-2"
                  />
                  <span>Homme</span>
                </label>
                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors">
                  <input
                    type="radio"
                    value="female"
                    {...register('gender', { required: true })}
                    className="mr-2"
                  />
                  <span>Femme</span>
                </label>
              </div>
            </div>

            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              {...register('password', {
                required: 'Le mot de passe est requis',
                minLength: {
                  value: 6,
                  message: 'Le mot de passe doit contenir au moins 6 caractères',
                },
              })}
              error={errors.password?.message}
            />

            <Input
              label="Confirmer le mot de passe"
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword', {
                required: 'Veuillez confirmer le mot de passe',
                validate: (value) =>
                  value === password || 'Les mots de passe ne correspondent pas',
              })}
              error={errors.confirmPassword?.message}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              S'inscrire
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              En vous inscrivant, vous acceptez nos{' '}
              <Link to="/terms" className="text-primary-600 hover:text-primary-700">
                Conditions d'utilisation
              </Link>{' '}
              et notre{' '}
              <Link to="/privacy" className="text-primary-600 hover:text-primary-700">
                Politique de confidentialité
              </Link>
            </p>
            <p className="mt-4 text-gray-600">
              Déjà un compte ?{' '}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
