// Types pour les utilisateurs
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  bio?: string;
  photos: string[];
  location?: {
    city: string;
    country: string;
    region?: string;
    commune?: string;
    quartier?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  isOnline?: boolean;
  preferences: {
    ageRange: {
      min: number;
      max: number;
    };
    maxDistance: number;
    interestedIn: ('male' | 'female')[];
  };
  verified: boolean;
  createdAt: string;
  lastActive: string;
  phone?: string; // Numéro de téléphone (visible uniquement après match)
  stats?: {
    likes: number;
    dislikes: number;
  };
}

// Types pour les abonnements
export type SubscriptionType = 'trial' | 'day' | 'week' | 'month' | '3months' | '6months' | 'year';

export interface Subscription {
  id: string;
  userId: string;
  type: SubscriptionType;
  startDate: string;
  endDate: string;
  messageLimit: number;
  messagesUsed: number;
  isActive: boolean;
  autoRenew: boolean;
}

export interface SubscriptionPlan {
  type: SubscriptionType;
  name: string;
  duration: number; // en jours
  price: number;
  messageLimit: number; // -1 pour illimité
  features: string[];
}

// Types pour les messages
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type?: 'text' | 'image';
  imageUrl?: string;
  timestamp: string;
  read: boolean;
  readAt?: string;
  deletedForEveryone?: boolean;
  deletedAt?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
  otherUser?: {
    id: string;
    firstName: string;
    lastName: string;
    age: number;
    photos?: string[];
    isOnline?: boolean;
    lastActive?: string;
  };
}

// Types pour les matchs
export interface Match {
  id: string;
  users: string[];
  createdAt: string;
  lastActivity?: string;
}

// Types pour les interactions (swipe)
export type SwipeAction = 'like' | 'dislike' | 'superlike';

export interface Swipe {
  id: string;
  userId: string;
  targetUserId: string;
  action: SwipeAction;
  timestamp: string;
}

// Types pour l'authentification
export interface AuthResponse {
  user: User;
  token: string;
  subscription: Subscription;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  phone?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
}

// Types pour les notifications
export interface Notification {
  id: string;
  userId: string;
  type: 'match' | 'message' | 'subscription' | 'system';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  link?: string;
}

