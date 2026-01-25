import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { pgPool } from '../config/database.js';
import { UserModel } from '../models/User.js';
import { SwipeModel } from '../models/Swipe.js';
import { MatchModel } from '../models/Match.js';
import { BlockModel } from '../models/Block.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configuration Multer pour l'upload de photos de profil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// Configuration Multer pour l'upload de photos de messages
const messagesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const messagesDir = path.join(process.env.UPLOAD_DIR || './uploads', 'messages');
    cb(null, messagesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// Configuration Multer pour l'upload de selfie de vérification
const verificationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const verificationDir = path.join(process.env.UPLOAD_DIR || './uploads', 'verification');
    try {
      fs.mkdirSync(verificationDir, { recursive: true });
    } catch (_e) {
      // ignore
    }
    cb(null, verificationDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  },
});

const messagesUpload = multer({
  storage: messagesStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  },
});

const verificationUpload = multer({
  storage: verificationStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  },
});

// Obtenir le profil de l'utilisateur
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await UserModel.findById(pgPool, req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du profil' });
  }
});

// Mettre à jour le profil
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ['firstName', 'lastName', 'bio', 'dateOfBirth', 'location', 'preferences', 'phone', 'privacy'];

    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await UserModel.update(pgPool, req.user.userId, updates);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
  }
});

// Upload une photo
router.post('/photos', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    const user = await UserModel.findById(pgPool, req.user.userId);
    
    const updatedPhotos = [...(user.photos || []), photoUrl];
    const updatedUser = await UserModel.update(pgPool, req.user.userId, { photos: updatedPhotos });

    // Retourner l'URL complète avec le backend
    const fullUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}${photoUrl}`;
    // Ou utiliser l'URL relative si le frontend peut la servir via proxy
    res.json({ url: photoUrl, fullUrl });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload de la photo' });
  }
});

// Supprimer une photo
router.delete('/photos', authenticateToken, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    const user = await UserModel.findById(pgPool, req.user.userId);
    
    const updatedPhotos = (user.photos || []).filter((photo) => photo !== photoUrl);
    await UserModel.update(pgPool, req.user.userId, { photos: updatedPhotos });

    res.json({ message: 'Photo supprimée' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la photo' });
  }
});

// Upload une photo pour un message
router.post('/messages/photos', authenticateToken, messagesUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const photoUrl = `/uploads/messages/${req.file.filename}`;
    res.json({ url: photoUrl });
  } catch (error) {
    console.error('Upload message photo error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload de la photo' });
  }
});

// Upload selfie vérification
router.post('/verification/selfie', authenticateToken, verificationUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const photoUrl = `/uploads/verification/${req.file.filename}`;
    const current = await UserModel.findById(pgPool, req.user.userId);
    if (!current) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const updatedUser = await UserModel.update(pgPool, req.user.userId, {
      verificationPhotoUrl: photoUrl,
      // On ne change pas le statut ici (submit explicite)
      verificationStatus: current.verificationStatus || 'unverified',
    });

    res.json({
      url: photoUrl,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Upload verification selfie error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload du selfie' });
  }
});

// Soumettre une demande de vérification
router.post('/verification/submit', authenticateToken, async (req, res) => {
  try {
    const user = await UserModel.findById(pgPool, req.user.userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    if (!user.verificationPhotoUrl) {
      return res.status(400).json({ message: 'Veuillez d’abord uploader un selfie' });
    }

    const updatedUser = await UserModel.update(pgPool, req.user.userId, {
      verificationStatus: 'pending',
      verified: false,
      verifiedAt: null,
    });

    res.json({
      message: 'Demande de vérification envoyée',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({ message: 'Erreur lors de la soumission' });
  }
});

// Statut de vérification
router.get('/verification/status', authenticateToken, async (req, res) => {
  try {
    const user = await UserModel.findById(pgPool, req.user.userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    res.json({
      verificationStatus: user.verificationStatus || 'unverified',
      verificationPhotoUrl: user.verificationPhotoUrl || null,
      verifiedAt: user.verifiedAt || null,
      verified: user.verified === true,
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du statut' });
  }
});

// Obtenir les profils à découvrir
router.get('/discoveries', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      ageMin,
      ageMax,
      region,
      commune,
      city,
      quartier,
      centerLat,
      centerLng,
      radiusKm,
    } = req.query;
    
    // Récupérer les IDs des utilisateurs déjà swipés
    const swipedResult = await pgPool.query(
      'SELECT DISTINCT target_user_id FROM swipes WHERE user_id = $1',
      [userId]
    );
    const swipedIds = swipedResult.rows.map((row) => row.target_user_id);

    // Construire les filtres
    const filters = {};
    if (ageMin) filters.ageMin = parseInt(ageMin);
    if (ageMax) filters.ageMax = parseInt(ageMax);
    if (region) filters.region = region;
    if (commune) filters.commune = commune;
    if (city) filters.city = city;
    if (quartier) filters.quartier = quartier;
    if (centerLat && centerLng) {
      filters.centerLat = parseFloat(centerLat);
      filters.centerLng = parseFloat(centerLng);
      filters.radiusKm = radiusKm ? parseFloat(radiusKm) : 50;
    }

    // Obtenir les découvertes avec filtres
    const discoveries = await UserModel.getDiscoveries(pgPool, userId, filters);

    // Filtrer les utilisateurs déjà swipés
    const excludedUserIds = new Set(await BlockModel.getExcludedUserIds(pgPool, userId));
    const filteredDiscoveries = discoveries.filter(
      (user) => !swipedIds.includes(user.id) && !excludedUserIds.has(user.id)
    );

    res.json(filteredDiscoveries.slice(0, 20)); // Limiter à 20 résultats
  } catch (error) {
    console.error('Get discoveries error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des profils' });
  }
});

// Mettre à jour le statut en ligne
router.post('/online-status', authenticateToken, async (req, res) => {
  try {
    const { isOnline } = req.body;
    await pgPool.query(
      'UPDATE users SET is_online = $1, last_active = CURRENT_TIMESTAMP WHERE id = $2',
      [isOnline === true, req.user.userId]
    );
    const io = req.app.get('io');
    if (io) {
      const privacy = await pgPool.query('SELECT privacy_hide_online FROM users WHERE id = $1', [req.user.userId]);
      const hideOnline = privacy.rows[0]?.privacy_hide_online === true;
      if (!hideOnline) {
        io.emit(isOnline === true ? 'user:online' : 'user:offline', {
          userId: req.user.userId,
          lastActive: new Date().toISOString(),
        });
      }
    }
    res.json({ message: 'Statut mis à jour' });
  } catch (error) {
    console.error('Update online status error:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du statut' });
  }
});

// Effectuer un swipe
router.post('/swipe', authenticateToken, async (req, res) => {
  try {
    const { userId: targetUserId, action } = req.body;
    const userId = req.user.userId;

    if (!['like', 'dislike', 'superlike'].includes(action)) {
      return res.status(400).json({ message: 'Action invalide' });
    }

    if (userId === targetUserId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas swiper votre propre profil' });
    }

    // Empêcher les swipes sur un utilisateur bloqué (dans un sens ou dans l'autre)
    const blocked = await BlockModel.isBlockedEitherWay(pgPool, userId, targetUserId);
    if (blocked) {
      return res.status(403).json({ message: 'Action impossible (utilisateur bloqué)' });
    }

    // Enregistrer le swipe
    await SwipeModel.create(pgPool, userId, targetUserId, action);

    let matched = false;

    // Si c'est un like ou superlike, vérifier si c'est un match
    if (action === 'like' || action === 'superlike') {
      matched = await SwipeModel.checkMatch(pgPool, userId, targetUserId);
      
      if (matched) {
        // Créer le match
        await MatchModel.create(pgPool, userId, targetUserId);
      }
    }

    res.json({ matched });
  } catch (error) {
    console.error('Swipe error:', error);
    res.status(500).json({ message: 'Erreur lors du swipe' });
  }
});

// Obtenir tous les utilisateurs (pour la recherche avancée - sans filtrer les swipes)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      ageMin,
      ageMax,
      region,
      commune,
      city,
      quartier,
      centerLat,
      centerLng,
      radiusKm,
    } = req.query;

    // Construire les filtres
    const filters = { limit: 100 }; // Limite augmentée pour la recherche avancée
    if (ageMin) filters.ageMin = parseInt(ageMin);
    if (ageMax) filters.ageMax = parseInt(ageMax);
    if (region) filters.region = region;
    if (commune) filters.commune = commune;
    if (city) filters.city = city;
    if (quartier) filters.quartier = quartier;
    if (centerLat && centerLng) {
      filters.centerLat = parseFloat(centerLat);
      filters.centerLng = parseFloat(centerLng);
      filters.radiusKm = radiusKm ? parseFloat(radiusKm) : 50;
    }

    // Obtenir tous les utilisateurs (sans filtrer les swipes)
    const allUsers = await UserModel.getDiscoveries(pgPool, userId, filters);

    const excludedUserIds = new Set(await BlockModel.getExcludedUserIds(pgPool, userId));
    res.json(allUsers.filter((u) => !excludedUserIds.has(u.id)));
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Obtenir les matchs
router.get('/matches', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const matches = await MatchModel.findByUserId(pgPool, req.user.userId);
    const excludedUserIds = new Set(await BlockModel.getExcludedUserIds(pgPool, currentUserId));
    
    // Récupérer les informations des utilisateurs matchés avec le numéro de téléphone
    const matchUsers = await Promise.all(
      matches.map(async (match) => {
        const otherUserId = match.users.find((id) => id !== currentUserId);
        if (!otherUserId || excludedUserIds.has(otherUserId)) return null;
        const user = await UserModel.findById(pgPool, otherUserId);
        if (!user) return null;
        
        // Récupérer le numéro de téléphone selon préférence privacy du matché
        const userRow = await pgPool.query('SELECT phone, privacy_share_phone FROM users WHERE id = $1', [otherUserId]);
        const sharePhone = userRow.rows[0]?.privacy_share_phone || 'afterMatch';
        const phone = sharePhone === 'never' ? null : (userRow.rows[0]?.phone || null);
        
        return {
          ...user,
          phone, // Inclure le numéro de téléphone pour les matchs
        };
      })
    );

    res.json(matchUsers.filter((user) => user !== null));
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des matchs' });
  }
});

// Obtenir les statistiques de likes/dislikes pour un utilisateur
router.get('/:userId/stats', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Compter les likes (like + superlike) reçus par cet utilisateur
    const likesResult = await pgPool.query(
      `SELECT COUNT(*) as count 
       FROM swipes 
       WHERE target_user_id = $1 AND action IN ('like', 'superlike')`,
      [userId]
    );
    const likesCount = parseInt(likesResult.rows[0]?.count || '0', 10);

    // Compter les dislikes reçus par cet utilisateur
    const dislikesResult = await pgPool.query(
      `SELECT COUNT(*) as count 
       FROM swipes 
       WHERE target_user_id = $1 AND action = 'dislike'`,
      [userId]
    );
    const dislikesCount = parseInt(dislikesResult.rows[0]?.count || '0', 10);

    res.json({
      likes: likesCount,
      dislikes: dislikesCount,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router;

