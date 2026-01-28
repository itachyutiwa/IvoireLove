import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * Hook pour gérer le timeout d'inactivité (1 minute)
 * Déconnecte l'utilisateur et redirige vers /login après 1 minute d'inactivité
 */
export const useInactivityTimeout = (timeoutMinutes: number = 1) => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutMs = timeoutMinutes * 60 * 1000; // 1 minute par défaut

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!isAuthenticated) {
      return; // Ne pas démarrer le timer si non authentifié
    }

    timeoutRef.current = setTimeout(() => {
      // Déconnexion après timeout
      logout();
      navigate('/login', { replace: true });
    }, timeoutMs);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      // Nettoyer le timer si déconnecté
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Événements utilisateur qui réinitialisent le timer
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Démarrer le timer initial
    resetTimeout();

    // Réinitialiser le timer à chaque événement utilisateur
    events.forEach((event) => {
      window.addEventListener(event, resetTimeout, { passive: true });
    });

    return () => {
      // Nettoyer les listeners et le timer
      events.forEach((event) => {
        window.removeEventListener(event, resetTimeout);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isAuthenticated, timeoutMs, logout, navigate]);
};
