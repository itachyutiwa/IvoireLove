export const SUBSCRIPTION_PLANS = {
  trial: {
    type: 'trial' as const,
    name: 'Essai',
    duration: 1,
    price: 0,
    messageLimit: 3,
    features: ['3 messages', '24h d\'accès'],
    badge: {
      text: 'Essai',
      bgColor: 'bg-gray-500',
      textColor: 'text-white',
    },
  },
  day: {
    type: 'day' as const,
    name: 'Pass Jour',
    duration: 1,
    price: 1000,
    messageLimit: -1,
    features: ['Messages illimités', '24h d\'accès'],
    badge: {
      text: 'Jour',
      bgColor: 'bg-blue-500',
      textColor: 'text-white',
    },
  },
  week: {
    type: 'week' as const,
    name: 'Pass Semaine',
    duration: 7,
    price: 3000,
    messageLimit: -1,
    features: ['Messages illimités', '7 jours d\'accès'],
    badge: {
      text: 'Semaine',
      bgColor: 'bg-green-500',
      textColor: 'text-white',
    },
  },
  month: {
    type: 'month' as const,
    name: 'Pass Mois',
    duration: 30,
    price: 10000,
    messageLimit: -1,
    features: ['Messages illimités', '30 jours d\'accès', 'Priorité dans les résultats'],
    badge: {
      text: 'Mois',
      bgColor: 'bg-purple-500',
      textColor: 'text-white',
    },
  },
  '3months': {
    type: '3months' as const,
    name: 'Pass 3 Mois',
    duration: 90,
    price: 25000,
    messageLimit: -1,
    features: [
      'Messages illimités',
      '90 jours d\'accès',
      'Priorité dans les résultats',
      'Badge Premium',
    ],
    badge: {
      text: 'Premium',
      bgColor: 'bg-gradient-to-r from-[#F26E27] to-[#FF8C42]',
      textColor: 'text-white',
    },
  },
  '6months': {
    type: '6months' as const,
    name: 'Pass 6 Mois',
    duration: 180,
    price: 45000,
    messageLimit: -1,
    features: [
      'Messages illimités',
      '180 jours d\'accès',
      'Priorité dans les résultats',
      'Badge Premium',
      'Super Likes illimités',
    ],
    badge: {
      text: 'Premium+',
      bgColor: 'bg-gradient-to-r from-[#F26E27] via-[#FF8C42] to-[#FFA500]',
      textColor: 'text-white',
    },
  },
  year: {
    type: 'year' as const,
    name: 'Pass Annuel',
    duration: 365,
    price: 80000,
    messageLimit: -1,
    features: [
      'Messages illimités',
      '365 jours d\'accès',
      'Priorité maximale',
      'Badge Premium',
      'Super Likes illimités',
      'Voir qui vous a liké',
    ],
    badge: {
      text: 'VIP',
      bgColor: 'bg-gradient-to-r from-[#F26E27] via-[#FF8C42] via-[#FFA500] to-[#FFD700]',
      textColor: 'text-white',
    },
  },
};

// Numéros de paiement pour les opérateurs mobiles
export const PAYMENT_NUMBERS = {
  MTN: '22500429098',
  ORANGE: '2250747389778',
  MOOV: '2250170948328',
  WAVE: '2250747389778',
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    VERIFY_PHONE: '/auth/verify-phone',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  USERS: {
    PROFILE: '/users/profile',
    DISCOVERIES: '/users/discoveries',
    MATCHES: '/users/matches',
    SWIPE: '/users/swipe',
    PHOTOS: '/users/photos',
  },
  MESSAGES: {
    CONVERSATIONS: '/messages/conversations',
    SEND: '/messages/send',
  },
  SUBSCRIPTIONS: {
    PLANS: '/subscriptions/plans',
    CURRENT: '/subscriptions/current',
    PURCHASE: '/subscriptions/purchase',
  },
};

