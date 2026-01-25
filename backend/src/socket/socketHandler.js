import jwt from 'jsonwebtoken';
import { MessageModel } from '../models/Message.js';
import { SubscriptionModel } from '../models/Subscription.js';
import { pgPool } from '../config/database.js';
import { analyzeMessageContent } from '../services/safetyEngine.js';
import { BlockModel } from '../models/Block.js';

export const setupSocket = (io) => {
  // Middleware d'authentification Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Token d\'authentification manquant'));
    }

    jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      (err, decoded) => {
        if (err) {
          return next(new Error('Token invalide'));
        }
        socket.userId = decoded.userId;
        next();
      }
    );
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Marquer l'utilisateur comme en ligne
    try {
      await pgPool.query(
        'UPDATE users SET is_online = TRUE, last_active = CURRENT_TIMESTAMP WHERE id = $1',
        [socket.userId]
      );
      // Notifier les autres utilisateurs si l'utilisateur n'a pas masqué sa présence
      const privacy = await pgPool.query('SELECT privacy_hide_online FROM users WHERE id = $1', [socket.userId]);
      const hideOnline = privacy.rows[0]?.privacy_hide_online === true;
      if (!hideOnline) {
        io.emit('user:online', { userId: socket.userId, lastActive: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Error updating online status:', error);
    }

    // Rejoindre la room de l'utilisateur
    socket.join(`user:${socket.userId}`);

    // Rejoindre une conversation
    socket.on('conversation:join', ({ conversationId }) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Quitter une conversation
    socket.on('conversation:leave', ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Envoyer un message
    socket.on('message:send', async ({ receiverId, content, type, imageUrl, voiceUrl, replyToMessageId }) => {
      try {
        // Vérifier les limites (sauf en développement où tout est illimité)
        if (process.env.NODE_ENV !== 'development') {
          const limit = await SubscriptionModel.checkLimit(pgPool, socket.userId);
          if (!limit.canSend) {
            socket.emit('message:error', {
              message: 'Limite de messages atteinte',
              remaining: limit.remaining,
            });
            return;
          }
        }

        // Blocage: empêcher l'envoi si l'un a bloqué l'autre
        const blocked = await BlockModel.isBlockedEitherWay(pgPool, socket.userId, receiverId);
        if (blocked) {
          socket.emit('message:error', { message: 'Impossible d’envoyer un message (utilisateur bloqué)' });
          return;
        }

        // Créer le message
        const msgType = type || 'text';
        if (msgType === 'audio' && !voiceUrl) {
          socket.emit('message:error', { message: 'Fichier audio requis' });
          return;
        }
        const analysis =
          msgType === 'text' || (msgType === 'image' && content)
            ? analyzeMessageContent(content || '')
            : { riskScore: 0, riskFlags: [], action: 'allow' };

        if (analysis.action === 'block') {
          socket.emit('message:error', {
            message:
              'Message bloqué pour votre sécurité. Évitez de partager des liens, numéros ou demandes d’argent.',
            riskScore: analysis.riskScore,
            riskFlags: analysis.riskFlags,
          });
          return;
        }

        const message = await MessageModel.create(
          socket.userId,
          receiverId,
          content,
          msgType,
          imageUrl,
          {
            riskScore: analysis.riskScore,
            riskFlags: analysis.riskFlags,
            voiceUrl: voiceUrl || null,
            replyToMessageId: replyToMessageId || null,
          }
        );

        // Incrémenter le compteur
        await SubscriptionModel.incrementMessagesUsed(pgPool, socket.userId);

        // Envoyer le message au destinataire
        io.to(`user:${receiverId}`).emit('message:new', message);
        io.to(`conversation:${message.conversationId}`).emit('message:new', message);

        // Confirmer l'envoi à l'expéditeur
        socket.emit('message:sent', message);
      } catch (error) {
        console.error('Socket message send error:', error);
        socket.emit('message:error', { message: 'Erreur lors de l\'envoi du message' });
      }
    });

    // Réagir à un message (toggle)
    socket.on('message:reaction', async ({ messageId, emoji }) => {
      try {
        const result = await MessageModel.toggleReaction(messageId, socket.userId, emoji);
        if (result?.conversationId) {
          io.to(`conversation:${result.conversationId}`).emit('message:reaction', result);
        }
      } catch (error) {
        console.error('Socket reaction error:', error);
        socket.emit('message:error', { message: 'Erreur lors de la réaction' });
      }
    });

    // Marquer les messages comme lus
    socket.on('message:read', async ({ conversationId }) => {
      try {
        await MessageModel.markAsRead(conversationId, socket.userId);
        
        // Notifier les autres participants
        io.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          userId: socket.userId,
        });
      } catch (error) {
        console.error('Socket message read error:', error);
      }
    });

    // Déconnexion
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Marquer l'utilisateur comme hors ligne
      try {
        await pgPool.query(
          'UPDATE users SET is_online = FALSE, last_active = CURRENT_TIMESTAMP WHERE id = $1',
          [socket.userId]
        );
        // Notifier les autres utilisateurs si l'utilisateur n'a pas masqué sa présence
        const privacy = await pgPool.query('SELECT privacy_hide_online FROM users WHERE id = $1', [socket.userId]);
        const hideOnline = privacy.rows[0]?.privacy_hide_online === true;
        if (!hideOnline) {
          io.emit('user:offline', { userId: socket.userId, lastActive: new Date().toISOString() });
        }
      } catch (error) {
        console.error('Error updating offline status:', error);
      }
    });
  });
};

