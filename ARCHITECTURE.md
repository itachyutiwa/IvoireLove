# Architecture de l'Application AppliRencontre

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Pages      │  │  Components  │  │   Services   │     │
│  │              │  │              │  │              │     │
│  │ - Login      │  │ - UI         │  │ - API Client │     │
│  │ - Register   │  │ - Layout     │  │ - Auth       │     │
│  │ - Discover   │  │ - Discover   │  │ - Messages   │     │
│  │ - Messages   │  │ - Subscription│ │ - Users      │     │
│  │ - Profile    │  │ - Auth       │  │ - Socket     │     │
│  │ - Matches    │  │              │  │ - Subscription│   │
│  │ - Subscription│ │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘           │
│                            │                               │
│                    ┌───────▼────────┐                      │
│                    │  State (Zustand)│                      │
│                    │                │                      │
│                    │ - Auth Store  │                      │
│                    │ - Message Store│                     │
│                    │ - Subscription│                     │
│                    │   Store        │                      │
│                    └────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                  BACKEND (À implémenter)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   API REST   │  │  WebSocket  │  │  Services    │     │
│  │              │  │  (Socket.io)│  │              │     │
│  │ - /auth      │  │ - Messages  │  │ - Auth       │     │
│  │ - /users     │  │ - Matches   │  │ - Matching   │     │
│  │ - /messages  │  │ - Notifications│ - Messaging  │     │
│  │ - /subscriptions│            │  │ - Payment     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘           │
│                            │                               │
│                    ┌───────▼────────┐                      │
│                    │   Databases    │                      │
│                    │                │                      │
│                    │ - PostgreSQL  │                      │
│                    │   (Users,      │                      │
│                    │    Matches)    │                      │
│                    │ - MongoDB      │                      │
│                    │   (Messages)   │                      │
│                    │ - Redis        │                      │
│                    │   (Cache,      │                      │
│                    │    Sessions)   │                      │
│                    └────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## Structure des Dossiers

```
src/
├── components/              # Composants réutilisables
│   ├── ui/                 # Composants UI de base
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Toast.tsx
│   ├── layout/             # Composants de layout
│   │   ├── Header.tsx
│   │   └── BottomNav.tsx
│   ├── discover/           # Composants de découverte
│   │   └── ProfileCard.tsx
│   ├── subscription/       # Composants d'abonnement
│   │   ├── SubscriptionBanner.tsx
│   │   └── SubscriptionModal.tsx
│   └── auth/               # Composants d'authentification
│       └── ProtectedRoute.tsx
│
├── pages/                  # Pages de l'application
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Discover.tsx
│   ├── Matches.tsx
│   ├── Messages.tsx
│   ├── Profile.tsx
│   └── Subscription.tsx
│
├── services/               # Services API
│   ├── api.ts              # Client API de base
│   ├── authService.ts
│   ├── userService.ts
│   ├── messageService.ts
│   ├── subscriptionService.ts
│   └── socketService.ts
│
├── store/                  # Stores Zustand
│   ├── authStore.ts
│   ├── messageStore.ts
│   └── subscriptionStore.ts
│
├── types/                  # Types TypeScript
│   └── index.ts
│
├── utils/                  # Utilitaires
│   ├── constants.ts
│   └── helpers.ts
│
├── hooks/                  # Hooks personnalisés
│   └── useSubscription.ts
│
├── styles/                 # Styles globaux
│   └── index.css
│
├── App.tsx                 # Composant principal
└── main.tsx                # Point d'entrée
```

## Flux de Données

### Authentification
```
User → Login/Register → authService → API → Backend
                                    ↓
                            AuthStore (Zustand)
                                    ↓
                            Protected Routes
```

### Découverte de Profils
```
Discover Page → userService.getDiscoveries() → API
                                    ↓
                            ProfileCard Component
                                    ↓
                            Swipe Action → userService.swipe()
                                    ↓
                            Match Notification (si match)
```

### Messagerie
```
Messages Page → messageService.getConversations() → API
                                    ↓
                            Socket Connection (WebSocket)
                                    ↓
                            Real-time Messages
                                    ↓
                            MessageStore Update
```

### Abonnements
```
Subscription Check → subscriptionService.checkLimit()
                                    ↓
                            Limit Validation
                                    ↓
                            Purchase Flow → Payment Gateway
                                    ↓
                            Subscription Update
```

## Système d'Abonnement

```
┌─────────────────────────────────────────────────┐
│            Période d'Essai (Trial)               │
│  - 3 messages                                    │
│  - 24h d'accès                                   │
│  - Lecture des profils                           │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│              Pass Payants                        │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   Jour   │  │ Semaine  │  │   Mois   │      │
│  │  2.99€   │  │  9.99€   │  │  29.99€  │      │
│  │ Messages │  │ Messages │  │ Messages │      │
│  │ illimités│  │ illimités│  │ illimités│      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 3 Mois   │  │ 6 Mois   │  │  Annuel  │      │
│  │  79.99€  │  │  139.99€ │  │  249.99€ │      │
│  │ + Badge  │  │ + Badge  │  │ + Tous   │      │
│  │ Premium  │  │ Premium  │  │ avantages│      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```

## Sécurité

1. **Authentification JWT**
   - Token stocké dans localStorage
   - Refresh automatique
   - Déconnexion automatique si token invalide

2. **Routes Protégées**
   - Vérification de l'authentification
   - Redirection vers login si non authentifié

3. **Validation**
   - Validation côté client (React Hook Form)
   - Validation côté serveur (à implémenter)

4. **Compte Unique**
   - Vérification par email/SMS
   - Device ID tracking (à implémenter)

## Responsive Design

- **Mobile First**: Design optimisé pour mobile
- **Breakpoints**:
  - Mobile: < 768px (BottomNav visible)
  - Tablet: 768px - 1024px
  - Desktop: > 1024px (Header navigation visible)

## Performance

- **Code Splitting**: Lazy loading des routes
- **Memoization**: React.memo pour les composants lourds
- **Optimistic Updates**: Mise à jour immédiate de l'UI
- **Caching**: Redis pour les sessions et données fréquentes

