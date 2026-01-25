import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import des configurations et modèles
import { initializeDatabases, pgPool } from './config/database.js';
import {
  createUserTable,
  createMatchTable,
  createSwipeTable,
  createSubscriptionTable,
  createPaymentTable,
  createVerificationCodeTable,
  createReportTable,
  createBlockTable,
  createSupportTicketTable,
} from './models/index.js';
import { initTestUser } from './utils/initTestUser.js';

// Import des routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import subscriptionRoutes from './routes/subscriptions.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';
import blockRoutes from './routes/blocks.js';
import supportRoutes from './routes/support.js';

// Import Socket.io handler
import { setupSocket } from './socket/socketHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 8000;

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rendre socket.io accessible aux routes (req.app.get('io'))
app.set('io', io);

// Servir les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Servir aussi les photos de messages
app.use('/uploads/messages', express.static(path.join(__dirname, '../uploads/messages')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/support', supportRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

// Setup Socket.io
setupSocket(io);

// Initialisation des bases de données et démarrage du serveur
const startServer = async () => {
  try {
    // Initialiser les connexions aux bases de données
    await initializeDatabases();

    // Créer les tables PostgreSQL
    console.log('Creating database tables...');
    await createUserTable(pgPool);
    await createMatchTable(pgPool);
    await createSwipeTable(pgPool);
    await createSubscriptionTable(pgPool);
    await createPaymentTable(pgPool);
    await createVerificationCodeTable(pgPool);
    await createReportTable(pgPool);
    await createBlockTable(pgPool);
    await createSupportTicketTable(pgPool);
    console.log('✅ Database tables created');

    // Créer l'utilisateur de test s'il n'existe pas
    console.log('Initializing test user...');
    await initTestUser();

    // En développement : mettre à jour tous les utilisateurs existants
    // pour qu'ils aient un abonnement Pass Mois (sauf test qui a Pass Annuel)
    if (process.env.NODE_ENV === 'development') {
      const { updateAllUsersSubscriptions } = await import('./utils/updateAllUsersSubscriptions.js');
      await updateAllUsersSubscriptions();
    }

    // Créer les dossiers uploads s'ils n'existent pas
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const messagesUploadDir = path.join(uploadDir, 'messages');
    const verificationUploadDir = path.join(uploadDir, 'verification');
    const voiceUploadDir = path.join(uploadDir, 'voice');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(messagesUploadDir)) {
      fs.mkdirSync(messagesUploadDir, { recursive: true });
    }
    if (!fs.existsSync(verificationUploadDir)) {
      fs.mkdirSync(verificationUploadDir, { recursive: true });
    }
    if (!fs.existsSync(voiceUploadDir)) {
      fs.mkdirSync(voiceUploadDir, { recursive: true });
    }

    // Démarrer le serveur
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Socket.io server ready`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

