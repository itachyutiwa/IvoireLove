# Guide de Démarrage Rapide - Backend

## 🚀 Démarrage en Mode Développement

### 1. Prérequis Minimum

**Seul PostgreSQL est obligatoire** pour démarrer le backend. MongoDB et Redis sont optionnels en développement.

#### PostgreSQL (Obligatoire)

```bash
# Installation (macOS)
brew install postgresql
brew services start postgresql

# Créer la base de données
createdb applirencontre
```

#### MongoDB (Optionnel - pour la messagerie)

```bash
# Installation (macOS)
brew install mongodb-community
brew services start mongodb-community
```

#### Redis (Optionnel - pour le cache)

```bash
# Installation (macOS)
brew install redis
brew services start redis
```

### 2. Configuration

Créez un fichier `.env` dans le dossier `backend/` :

```env
PORT=8000
NODE_ENV=development

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# PostgreSQL (OBLIGATOIRE)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=applirencontre
POSTGRES_USER=akone  # Votre nom d'utilisateur macOS
POSTGRES_PASSWORD=   # Laissez vide si pas de mot de passe

# MongoDB (OPTIONNEL)
MONGODB_URI=mongodb://localhost:27017/applirencontre

# Redis (OPTIONNEL)
REDIS_HOST=localhost
REDIS_PORT=6379

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

CORS_ORIGIN=http://localhost:3000
```

**Important** : Remplacez `POSTGRES_USER=akone` par votre nom d'utilisateur macOS si différent.

### 3. Installation et Démarrage

```bash
cd backend
npm install
npm run dev
```

### 4. Utilisateur de Test

Un utilisateur de test est **créé automatiquement** au premier démarrage :

- **Email**: `test@example.com`
- **Password**: `password123`

Vous pouvez vous connecter avec ces identifiants ou créer un nouveau compte.

## ✅ Vérification

Une fois le serveur démarré, vous devriez voir :

```
✅ PostgreSQL connected
⚠️  MongoDB non disponible (optionnel en développement)
⚠️  Redis non disponible (optionnel en développement)
✅ Database tables created
✅ Utilisateur de test créé avec succès
🚀 Server running on http://localhost:8000
```

## 🔧 Dépannage

### Erreur PostgreSQL

Si vous voyez `role "postgres" does not exist` :
- Vérifiez que `POSTGRES_USER` dans `.env` correspond à votre nom d'utilisateur macOS
- Ou laissez-le vide pour utiliser automatiquement votre utilisateur système

### MongoDB non disponible

C'est normal en développement ! La messagerie ne fonctionnera pas, mais le reste de l'application fonctionne.

### Redis non disponible

C'est normal en développement ! Le cache ne fonctionnera pas, mais l'application fonctionne.

## 📝 Notes

- L'utilisateur de test est créé automatiquement au premier démarrage
- Si MongoDB n'est pas disponible, vous pouvez toujours tester l'inscription et la connexion
- Les photos uploadées sont stockées dans `backend/uploads/`
- En production, toutes les bases de données doivent être configurées

