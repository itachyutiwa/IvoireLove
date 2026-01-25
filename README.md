# AppliRencontre - Application de Rencontre Moderne

Application web et mobile de rencontre avec système d'abonnement et période d'essai.

## 🚀 Technologies Utilisées

- **React 18** avec TypeScript
- **Vite** pour le build et le développement
- **React Router** pour la navigation
- **Zustand** pour la gestion d'état
- **Framer Motion** pour les animations
- **Socket.io Client** pour la messagerie en temps réel
- **Tailwind CSS** pour le styling
- **React Hook Form** pour la gestion des formulaires
- **Axios** pour les requêtes HTTP

## 📁 Structure du Projet

```
src/
├── components/          # Composants réutilisables
│   ├── ui/             # Composants UI de base
│   ├── layout/         # Composants de layout
│   ├── discover/       # Composants de découverte
│   ├── subscription/   # Composants d'abonnement
│   └── auth/           # Composants d'authentification
├── pages/              # Pages de l'application
├── services/           # Services API
├── store/              # Stores Zustand
├── types/              # Types TypeScript
├── utils/              # Utilitaires
├── hooks/              # Hooks personnalisés
└── styles/             # Styles globaux
```

## 🎯 Fonctionnalités

### Authentification
- Inscription avec validation
- Connexion sécurisée
- Gestion de compte unique
- Vérification par email/SMS

### Découverte de Profils
- Interface de swipe intuitive
- Affichage des profils avec photos
- Actions : Like, Dislike, Super Like
- Système de matchs

### Messagerie
- Messages en temps réel via WebSocket
- Indicateurs de lecture
- Compteur de messages non lus
- Limitation selon l'abonnement

### Abonnements
- Période d'essai (3 messages, 24h)
- Pass Jour/Semaine/Mois/3 Mois/6 Mois/Annuel
- Gestion des limites de messages
- Interface de souscription

### Profil Utilisateur
- Édition du profil
- Upload de photos (drag & drop)
- Gestion des préférences
- Badge de vérification

## 🛠️ Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour la production
npm run build

# Prévisualiser le build
npm run preview
```

## ⚙️ Configuration

Créez un fichier `.env` à la racine du projet :

```env
VITE_API_URL=http://localhost:8000/api
VITE_SOCKET_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=votre_cle_api_google_maps
```

**Note :** Pour utiliser la fonctionnalité de recherche avancée avec carte (`/filter`), vous devez obtenir une clé API Google Maps depuis [Google Cloud Console](https://console.cloud.google.com/).

## 📱 Responsive Design

L'application est entièrement responsive avec :
- Navigation mobile en bas d'écran
- Navigation desktop en haut
- Interface adaptative selon la taille d'écran

## 🔒 Sécurité

- Authentification JWT
- Routes protégées
- Validation des formulaires
- Gestion des erreurs

## 📝 Notes

Le backend n'est pas encore implémenté. Les services API sont prêts et attendent l'implémentation du backend.

## 🎨 Design

- Design moderne et minimaliste
- Animations fluides avec Framer Motion
- Palette de couleurs cohérente
- Interface utilisateur intuitive

