import express from 'express';
import { pgPool } from '../config/database.js';
import { MessageModel } from '../models/Message.js';
import { SubscriptionModel } from '../models/Subscription.js';
import { authenticateToken } from '../middleware/auth.js';
import { analyzeMessageContent } from '../services/safetyEngine.js';
import { BlockModel } from '../models/Block.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Upload audio messages (MVP)
const voiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const voiceDir = path.join(process.env.UPLOAD_DIR || './uploads', 'voice');
    try {
      fs.mkdirSync(voiceDir, { recursive: true });
    } catch (_e) {
      // ignore
    }
    cb(null, voiceDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const voiceUpload = multer({
  storage: voiceStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|m4a|aac|ogg|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetypeOk = file.mimetype?.startsWith('audio/');
    if (extname && mimetypeOk) cb(null, true);
    else cb(new Error('Seuls les fichiers audio sont autorisés'));
  },
});

router.post('/voice', authenticateToken, voiceUpload.single('voice'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni' });
    const url = `/uploads/voice/${req.file.filename}`;
    res.json({ url });
  } catch (error) {
    console.error('Upload voice error:', error);
    res.status(500).json({ message: 'Erreur lors de l’upload du message vocal' });
  }
});

// Obtenir les conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const excludedUserIds = new Set(await BlockModel.getExcludedUserIds(pgPool, userId));

    const conversations = (await MessageModel.getConversations(userId)).filter((conv) => {
      const otherUserId = conv.participants?.find((id) => id !== userId);
      if (!otherUserId) return true;
      return !excludedUserIds.has(otherUserId);
    });
    
    // Enrichir les conversations avec les informations des utilisateurs
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.participants.find((id) => id !== userId);
        if (!otherUserId) {
          return conv;
        }
        
        try {
          // Récupérer les informations de l'autre utilisateur depuis PostgreSQL (incluant les photos)
          const user = await pgPool.query(
            'SELECT id, first_name, last_name, date_of_birth, photos, is_online, last_active, privacy_hide_online, privacy_hide_last_active FROM users WHERE id = $1',
            [otherUserId]
          );
          
          if (user.rows.length > 0) {
            const userData = user.rows[0];
            // Calculer l'âge
            const birthDate = new Date(userData.date_of_birth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            
            return {
              ...conv,
              otherUser: {
                id: userData.id,
                firstName: userData.first_name,
                lastName: userData.last_name,
                age,
                photos: userData.photos || [],
                isOnline: userData.privacy_hide_online === true ? undefined : userData.is_online === true,
                lastActive:
                  userData.privacy_hide_last_active === true
                    ? undefined
                    : userData.last_active
                      ? new Date(userData.last_active).toISOString()
                      : undefined,
              },
            };
          }
        } catch (error) {
          console.error(`Error fetching user ${otherUserId}:`, error);
        }
        
        return conv;
      })
    );
    
    res.json(enrichedConversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des conversations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtenir les messages d'une conversation
router.get('/conversations/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const participants = (conversationId || '').split('_').filter(Boolean);
    const otherUserId = participants.find((id) => id !== userId);
    if (otherUserId) {
      const blocked = await BlockModel.isBlockedEitherWay(pgPool, userId, otherUserId);
      if (blocked) {
        return res.status(403).json({ message: 'Conversation indisponible (utilisateur bloqué)' });
      }
    }
    const messages = await MessageModel.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
  }
});

// Envoyer un message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { receiverId, content, type, imageUrl, voiceUrl, replyToMessageId } = req.body;
    const senderId = req.user.userId;

    if (!receiverId) {
      return res.status(400).json({ message: 'Destinataire requis' });
    }

    if (!content && !imageUrl && !voiceUrl) {
      return res.status(400).json({ message: 'Contenu, image ou audio requis' });
    }

    // Vérifier les limites d'abonnement (sauf en développement où tout est illimité)
    if (process.env.NODE_ENV !== 'development') {
      const limit = await SubscriptionModel.checkLimit(pgPool, senderId);
      if (!limit.canSend) {
        return res.status(403).json({
          message: 'Limite de messages atteinte',
          remaining: limit.remaining,
        });
      }
    }

    // Blocage: empêcher l'envoi si l'un a bloqué l'autre
    const blocked = await BlockModel.isBlockedEitherWay(pgPool, senderId, receiverId);
    if (blocked) {
      return res.status(403).json({ message: 'Impossible d’envoyer un message (utilisateur bloqué)' });
    }

    // Créer le message (vérifie automatiquement MongoDB)
    let message;
    try {
      const msgType = type || 'text';
      if (msgType === 'audio' && !voiceUrl) {
        return res.status(400).json({ message: 'Fichier audio requis' });
      }
      const analysis =
        msgType === 'text' || (msgType === 'image' && content)
          ? analyzeMessageContent(content || '')
          : { riskScore: 0, riskFlags: [], action: 'allow' };

      if (analysis.action === 'block') {
        return res.status(400).json({
          message:
            'Message bloqué pour votre sécurité. Évitez de partager des liens, numéros ou demandes d’argent.',
          riskScore: analysis.riskScore,
          riskFlags: analysis.riskFlags,
        });
      }

      message = await MessageModel.create(
        senderId,
        receiverId,
        content,
        msgType,
        imageUrl,
        {
          riskScore: analysis.riskScore,
          riskFlags: analysis.riskFlags,
          replyToMessageId: replyToMessageId || null,
          voiceUrl: voiceUrl || null,
        }
      );
    } catch (error) {
      if (error.message.includes('MongoDB')) {
        return res.status(503).json({ 
          message: 'Service de messagerie temporairement indisponible. Veuillez démarrer MongoDB.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      throw error;
    }

    // Incrémenter le compteur de messages utilisés
    await SubscriptionModel.incrementMessagesUsed(pgPool, senderId);

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du message' });
  }
});

// Réactions (toggle)
router.post('/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body || {};
    const userId = req.user.userId;

    const result = await MessageModel.toggleReaction(messageId, userId, emoji);

    const io = req.app.get('io');
    if (io && result?.conversationId) {
      io.to(`conversation:${result.conversationId}`).emit('message:reaction', result);
    }

    res.json(result);
  } catch (error) {
    if (error?.code === 'NOT_FOUND') return res.status(404).json({ message: error.message });
    if (error?.code === 'FORBIDDEN') return res.status(403).json({ message: error.message });
    console.error('Toggle reaction error:', error);
    res.status(500).json({ message: 'Erreur lors de la réaction' });
  }
});

// Marquer les messages comme lus
router.post('/conversations/:conversationId/read', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    await MessageModel.markAsRead(conversationId, req.user.userId);
    res.json({ message: 'Messages marqués comme lus' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Erreur lors du marquage des messages' });
  }
});

// Supprimer un message "pour tous" (dans les 24h)
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const requesterId = req.user.userId;

    const result = await MessageModel.deleteForEveryone(messageId, requesterId);

    // Notifier en temps réel les deux utilisateurs + la conversation
    const io = req.app.get('io');
    if (io && result?.conversationId) {
      const payload = {
        conversationId: result.conversationId,
        messageId: result.messageId,
        deletedAt: result.deletedAt,
        deletedBy: result.deletedBy,
      };
      io.to(`conversation:${result.conversationId}`).emit('message:deleted', payload);
      if (result.senderId) io.to(`user:${result.senderId}`).emit('message:deleted', payload);
      if (result.receiverId) io.to(`user:${result.receiverId}`).emit('message:deleted', payload);
    }

    res.json({ message: 'Message supprimé', ...result });
  } catch (error) {
    if (error?.code === 'NOT_FOUND') {
      return res.status(404).json({ message: error.message || 'Message introuvable' });
    }
    if (error?.code === 'FORBIDDEN') {
      return res.status(403).json({ message: error.message || 'Action non autorisée' });
    }
    if (error?.code === 'TOO_LATE') {
      return res.status(400).json({ message: error.message || 'Délai dépassé' });
    }

    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du message' });
  }
});

export default router;

