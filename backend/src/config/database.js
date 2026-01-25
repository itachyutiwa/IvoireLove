import pg from 'pg';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL Connection (Users, Matches, Subscriptions)
export const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'applirencontre',
  // Sur macOS (brew), le rôle par défaut est souvent l'utilisateur système (ex: "akone"),
  // pas forcément "postgres".
  user: process.env.POSTGRES_USER || process.env.PGUSER || process.env.USER,
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

// MongoDB Connection (Messages)
export const connectMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/applirencontre';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

// Redis Connection (Cache, Sessions)
export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    // Ne pas bloquer si Redis n'est pas disponible
    console.warn('⚠️  Redis connection failed (non bloquant):', error.message);
  }
};

// Initialize all connections
export const initializeDatabases = async () => {
  try {
    // Test PostgreSQL (obligatoire)
    await pgPool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected');

    // Connect MongoDB (optionnel en développement)
    try {
      await connectMongoDB();
    } catch (error) {
      console.warn('⚠️  MongoDB non disponible (optionnel en développement):', error.message);
      console.warn('   La messagerie ne fonctionnera pas sans MongoDB');
    }

    // Connect Redis (optionnel en développement)
    try {
      await connectRedis();
    } catch (error) {
      console.warn('⚠️  Redis non disponible (optionnel en développement):', error.message);
      console.warn('   Le cache ne fonctionnera pas sans Redis');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    // En développement, on peut continuer même si MongoDB/Redis échouent
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};

