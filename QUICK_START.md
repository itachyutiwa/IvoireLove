# Guide de Démarrage Rapide

## Installation

```bash
# Installer les dépendances
npm install
```

## Configuration

Créez un fichier `.env` à la racine du projet :

```env
VITE_API_URL=http://localhost:8000/api
VITE_SOCKET_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=votre_cle_api_google_maps
```

**Note importante :** Pour utiliser la fonctionnalité de recherche avancée avec carte (`/filter`), vous devez obtenir une clé API Google Maps :
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un projet ou sélectionnez-en un existant
3. Activez l'API "Maps JavaScript API"
4. Créez des identifiants (clé API)
5. Ajoutez la clé dans votre fichier `.env` comme `VITE_GOOGLE_MAPS_API_KEY=votre_cle_ici`

## Démarrage

```bash
# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## Build Production

```bash
# Compiler pour la production
npm run build

# Prévisualiser le build
npm run preview
```

## Structure des Routes

- `/login` - Page de connexion
- `/register` - Page d'inscription
- `/discover` - Découverte de profils (swipe)
- `/matches` - Liste des matchs
- `/messages` - Messagerie
- `/profile` - Profil utilisateur
- `/subscription` - Gestion des abonnements

## Fonctionnalités Implémentées

✅ Authentification (Login/Register)
✅ Interface de swipe avec animations
✅ Système de messagerie (UI prête)
✅ Gestion de profil
✅ Système d'abonnement avec période d'essai
✅ Design responsive (mobile + desktop)
✅ Navigation intuitive
✅ Gestion d'état avec Zustand
✅ Services API prêts pour le backend

## Prochaines Étapes

Le frontend est complet. Il reste à implémenter le backend pour :
- Authentification réelle
- Stockage des données
- WebSocket pour la messagerie
- Système de paiement
- Gestion des abonnements

