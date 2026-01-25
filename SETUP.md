# Guide de Configuration Complète

## 🚀 Démarrage Rapide

### 1. Frontend

```bash
# Dans le dossier racine
npm install
npm run dev
```

Le frontend sera accessible sur `http://localhost:3000`

### 2. Backend

```bash
# Dans le dossier backend
cd backend
npm install

# Créer le fichier .env
cp .env.example .env

# Modifier les variables d'environnement si nécessaire
# Puis démarrer le serveur
npm run dev
```

Le backend sera accessible sur `http://localhost:8000`

## 📋 Prérequis Système

### Bases de Données

#### PostgreSQL

```bash
# Installation (macOS)
brew install postgresql
brew services start postgresql

# Créer la base de données
createdb applirencontre

# Ou via psql
psql -U postgres
CREATE DATABASE applirencontre;
```

#### MongoDB

```bash
# Installation (macOS)
brew install mongodb-community
brew services start mongodb-community

# MongoDB démarrera automatiquement sur le port 27017
```

#### Redis

```bash
# Installation (macOS)
brew install redis
brew services start redis

# Redis démarrera automatiquement sur le port 6379
```

## ⚙️ Configuration

### Frontend (.env)

Créez un fichier `.env` à la racine du projet :

```env
VITE_API_URL=http://localhost:8000/api
VITE_SOCKET_URL=http://localhost:8000
```

### Backend (.env)

Créez un fichier `.env` dans le dossier `backend/` :

```env
PORT=8000
NODE_ENV=development

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=applirencontre
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

MONGODB_URI=mongodb://localhost:27017/applirencontre

REDIS_HOST=localhost
REDIS_PORT=6379

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

CORS_ORIGIN=http://localhost:3000
```

## 🧪 Test de l'Application

### Compte de Test

Vous pouvez utiliser le compte de test intégré :
- **Email**: `test@example.com`
- **Password**: `password123`

Ou créer un nouveau compte via l'interface d'inscription.

### Vérification

1. Démarrer toutes les bases de données (PostgreSQL, MongoDB, Redis)
2. Démarrer le backend : `cd backend && npm run dev`
3. Démarrer le frontend : `npm run dev`
4. Ouvrir `http://localhost:3000`
5. Se connecter avec le compte de test ou créer un nouveau compte

## 📁 Structure du Projet

```
applirencontre/
├── backend/              # Backend Node.js
│   ├── src/
│   │   ├── config/      # Configuration DB
│   │   ├── models/      # Modèles de données
│   │   ├── routes/      # Routes API
│   │   ├── middleware/  # Middlewares
│   │   ├── socket/      # WebSocket
│   │   └── server.js    # Serveur principal
│   └── package.json
├── src/                  # Frontend React
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── store/
│   └── ...
└── package.json
```

## 🔧 Dépannage

### Erreur de connexion PostgreSQL

```bash
# Vérifier que PostgreSQL est démarré
brew services list | grep postgresql

# Redémarrer si nécessaire
brew services restart postgresql
```

### Erreur de connexion MongoDB

```bash
# Vérifier que MongoDB est démarré
brew services list | grep mongodb

# Redémarrer si nécessaire
brew services restart mongodb-community
```

### Erreur de connexion Redis

```bash
# Vérifier que Redis est démarré
brew services list | grep redis

# Redémarrer si nécessaire
brew services restart redis
```

### Erreur CORS

Assurez-vous que `CORS_ORIGIN` dans le `.env` du backend correspond à l'URL du frontend.

### Port déjà utilisé

Si le port 8000 est déjà utilisé, modifiez `PORT` dans le `.env` du backend.

## 📝 Notes Importantes

- Les tables PostgreSQL sont créées automatiquement au premier démarrage
- Les collections MongoDB sont créées automatiquement
- Le dossier `uploads/` est créé automatiquement pour les photos
- En production, configurez des variables d'environnement sécurisées
- Intégrez un service de paiement réel (Stripe/Paystack) pour la production

## 🚀 Déploiement

Pour le déploiement en production :

1. Configurez les variables d'environnement de production
2. Utilisez un service de stockage cloud pour les photos (S3, Cloudinary)
3. Configurez HTTPS
4. Intégrez un service de paiement réel
5. Configurez la vérification email/SMS
6. Activez les logs et monitoring

