import express from 'express';
import { pgPool } from '../config/database.js';
import { MessageModel } from '../models/Message.js';
import { SubscriptionModel } from '../models/Subscription.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Obtenir les conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const conversations = await MessageModel.getConversations(req.user.userId);
    
    // Enrichir les conversations avec les informations des utilisateurs
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.participants.find((id) => id !== req.user.userId);
        if (!otherUserId) {
          return conv;
        }
        
        try {
          // Récupérer les informations de l'autre utilisateur depuis PostgreSQL (incluant les photos)
          const user = await pgPool.query(
            'SELECT id, first_name, last_name, date_of_birth, photos, is_online, last_active FROM users WHERE id = $1',
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
                isOnline: userData.is_online === true,
                lastActive: userData.last_active ? new Date(userData.last_active).toISOString() : undefined,
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
    const { receiverId, content, type, imageUrl } = req.body;
    const senderId = req.user.userId;

    if (!receiverId) {
      return res.status(400).json({ message: 'Destinataire requis' });
    }

    if (!content && !imageUrl) {
      return res.status(400).json({ message: 'Contenu ou image requis' });
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

    // Créer le message (vérifie automatiquement MongoDB)
    let message;
    try {
      message = await MessageModel.create(senderId, receiverId, content, type || 'text', imageUrl);
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

export default router;

