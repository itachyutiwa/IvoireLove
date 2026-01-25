// Détection de la plateforme (web/mobile)
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Vérifier les patterns mobiles
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase()
  );
};

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
};

// Formater le numéro pour WhatsApp
export const formatPhoneForWhatsApp = (phone: string): string => {
  // Supprimer tous les caractères non numériques
  const cleaned = phone.replace(/\D/g, '');
  // Si le numéro commence par 0, le remplacer par l'indicatif du pays (ex: +33 pour la France)
  // Pour l'instant, on retourne tel quel, mais on peut ajouter une logique de détection
  return cleaned;
};

// Vérifier si WhatsApp est disponible
export const hasWhatsApp = (): boolean => {
  return isMobile();
};

