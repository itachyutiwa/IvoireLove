import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { IoHeart, IoCheckmarkCircle, IoLockClosed } from 'react-icons/io5';
import toast from 'react-hot-toast';

interface ForgotPasswordForm {
  phone: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'verify' | 'reset'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [countryCode, setCountryCode] = useState('CI');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ForgotPasswordForm>();

  const newPassword = watch('newPassword');

  // Étape 1 : Demander le code de réinitialisation
  const handleRequestCode = async () => {
    if (!phoneValue || phoneValue.length < 10) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.requestPasswordReset(phoneValue);
      toast.success(response.message || 'Code de réinitialisation envoyé par SMS');
      setStep('verify');
    } catch (error: any) {
      console.error('Request password reset error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de l\'envoi du code';
      toast.error(errorMessage);
      if (import.meta.env.DEV && error.response?.data?.error) {
        console.error('Error details:', error.response.data.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Étape 2 : Vérifier le code
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Veuillez entrer un code de 6 chiffres');
      return;
    }

    setIsVerifying(true);
    try {
      await authService.verifyPasswordResetCode(phoneValue, verificationCode);
      toast.success('Code vérifié avec succès');
      setStep('reset');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Code de vérification invalide');
    } finally {
      setIsVerifying(false);
    }
  };

  // Étape 3 : Réinitialiser le mot de passe
  const handleResetPassword = async (data: ForgotPasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsResetting(true);
    try {
      await authService.resetPasswordWithCode(phoneValue, verificationCode, data.newPassword);
      toast.success('Mot de passe réinitialisé avec succès !');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResendCode = async () => {
    if (!phoneValue) {
      toast.error('Numéro de téléphone requis');
      return;
    }

    try {
      await authService.requestPasswordReset(phoneValue);
      toast.success('Code renvoyé par SMS');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi du code');
    }
  };

  // Étape 1 : Saisie du numéro de téléphone
  if (step === 'phone') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-primary-200">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-[#F26E27] via-[#FFFFFF] to-[#12C43F] p-3 rounded-full shadow-lg">
                  <IoLockClosed className="text-3xl" style={{ 
                    background: 'linear-gradient(to right, #F26E27, #FFFFFF, #12C43F)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: '#F26E27'
                  }} />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Mot de passe oublié
              </h1>
              <p className="text-gray-600">
                Entrez le numéro de téléphone associé à votre compte IvoireLove
              </p>
            </div>

            <div className="space-y-4">
              <PhoneInput
                label="Numéro de téléphone"
                value={phoneValue}
                onChange={(value, code) => {
                  setPhoneValue(value);
                  setCountryCode(code);
                }}
                countryCode={countryCode}
              />

              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={handleRequestCode}
                isLoading={isLoading}
                disabled={!phoneValue || phoneValue.length < 10}
              >
                Envoyer le code de réinitialisation
              </Button>

              <div className="text-center pt-4 border-t border-gray-200">
                <Link
                  to="/login"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  ← Retour à la connexion
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Étape 2 : Vérification du code
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
                Vérification du code
              </h1>
              <p className="text-gray-600">
                Nous avons envoyé un code de réinitialisation par SMS de la part de <strong className="text-[#F26E27]">IvoireLove</strong>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                à {phoneValue}
              </p>
              {import.meta.env.DEV && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ Mode développement :</strong> Le code de réinitialisation est affiché dans la console du serveur backend.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code de réinitialisation (6 chiffres)
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
                    setStep('phone');
                    setVerificationCode('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  ← Retour
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Étape 3 : Nouveau mot de passe
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-primary-200">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-[#F26E27] via-[#FFFFFF] to-[#12C43F] p-3 rounded-full shadow-lg">
                <IoLockClosed className="text-3xl" style={{ 
                  background: 'linear-gradient(to right, #F26E27, #FFFFFF, #12C43F)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: '#F26E27'
                }} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Nouveau mot de passe
            </h1>
            <p className="text-gray-600">
              Créez un nouveau mot de passe pour votre compte
            </p>
          </div>

          <form onSubmit={handleSubmit(handleResetPassword)} className="space-y-4">
            <Input
              label="Nouveau mot de passe"
              type="password"
              placeholder="••••••••"
              {...register('newPassword', {
                required: 'Le mot de passe est requis',
                minLength: {
                  value: 6,
                  message: 'Le mot de passe doit contenir au moins 6 caractères',
                },
              })}
              error={errors.newPassword?.message}
            />

            <Input
              label="Confirmer le mot de passe"
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword', {
                required: 'Veuillez confirmer le mot de passe',
                validate: (value) =>
                  value === newPassword || 'Les mots de passe ne correspondent pas',
              })}
              error={errors.confirmPassword?.message}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isResetting}
            >
              Réinitialiser le mot de passe
            </Button>

            <div className="text-center pt-4 border-t border-gray-200">
              <Link
                to="/login"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Retour à la connexion
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

