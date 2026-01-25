# Backend AppliRencontre

Backend API pour l'application de rencontre AppliRencontre.

## 🚀 Technologies

- **Node.js** avec Express
- **PostgreSQL** pour les utilisateurs, matchs, swipes et abonnements
- **MongoDB** pour les messages
- **Redis** pour le cache et les sessions
- **Socket.io** pour la messagerie en temps réel
- **JWT** pour l'authentification

## 📋 Prérequis

- Node.js 18+
- PostgreSQL 14+
- MongoDB 6+
- Redis 7+

## 🛠️ Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier .env.example vers .env
cp .env.example .env

# Modifier les variables d'environnement dans .env
```

## ⚙️ Configuration

Créez un fichier `.env` à la racine du dossier backend :

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

## 🗄️ Configuration des Bases de Données

### PostgreSQL

```bash
# Créer la base de données
createdb applirencontre

# Ou via psql
psql -U postgres
CREATE DATABASE applirencontre;
```

Les tables seront créées automatiquement au démarrage du serveur.

### MongoDB

MongoDB doit être en cours d'exécution. Les collections seront créées automatiquement.

### Redis

Redis doit être en cours d'exécution. Aucune configuration supplémentaire nécessaire.

## 🚀 Démarrage

```bash
# Mode développement (avec nodemon)
npm run dev

# Mode production
npm start
```

Le serveur sera accessible sur `http://localhost:8000`

## 📡 API Endpoints

### Authentification

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Utilisateur actuel
- `GET /api/auth/subscription` - Abonnement actuel

### Utilisateurs

- `GET /api/users/profile` - Profil utilisateur
- `PUT /api/users/profile` - Mettre à jour le profil
- `POST /api/users/photos` - Upload une photo
- `DELETE /api/users/photos` - Supprimer une photo
- `GET /api/users/discoveries` - Profils à découvrir
- `POST /api/users/swipe` - Effectuer un swipe
- `GET /api/users/matches` - Liste des matchs

### Messages

- `GET /api/messages/conversations` - Liste des conversations
- `GET /api/messages/conversations/:id` - Messages d'une conversation
- `POST /api/messages/send` - Envoyer un message
- `POST /api/messages/conversations/:id/read` - Marquer comme lu

### Abonnements

- `GET /api/subscriptions/plans` - Plans disponibles
- `GET /api/subscriptions/current` - Abonnement actuel
- `POST /api/subscriptions/purchase` - Acheter un abonnement
- `GET /api/subscriptions/check-limit` - Vérifier les limites
- `POST /api/subscriptions/cancel` - Annuler l'abonnement

## 🔌 WebSocket Events

### Client → Server

- `conversation:join` - Rejoindre une conversation
- `conversation:leave` - Quitter une conversation
- `message:send` - Envoyer un message
- `message:read` - Marquer comme lu

### Server → Client

- `message:new` - Nouveau message reçu
- `message:sent` - Message envoyé avec succès
- `message:read` - Messages marqués comme lus
- `message:error` - Erreur lors de l'envoi

## 🔒 Authentification

Toutes les routes (sauf `/api/auth/register` et `/api/auth/login`) nécessitent un token JWT dans le header :

```
Authorization: Bearer <token>
```

## 📁 Structure

```
backend/
├── src/
│   ├── config/          # Configuration des bases de données
│   ├── models/          # Modèles de données
│   ├── routes/          # Routes API
│   ├── middleware/      # Middlewares (auth, validation)
│   ├── socket/          # Gestionnaire Socket.io
│   └── server.js        # Point d'entrée
├── uploads/             # Fichiers uploadés
└── package.json
```

## 🧪 Tests

Pour tester l'API, vous pouvez utiliser le compte de test :
- Email: `test@example.com`
- Password: `password123`

Ou créer un nouveau compte via `/api/auth/register`

## 📝 Notes

- Les photos sont stockées dans le dossier `uploads/`
- En production, configurez un service de stockage cloud (S3, Cloudinary, etc.)
- Intégrez Stripe/Paystack pour les paiements réels
- Configurez la vérification email/SMS pour la production

