import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    receiverId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: false,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ['text', 'image'],
      default: 'text',
    },
    imageUrl: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    deletedForEveryone: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [String],
      required: true,
      index: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

export const Message = mongoose.model('Message', messageSchema);
export const Conversation = mongoose.model('Conversation', conversationSchema);

export const MessageModel = {
  async create(senderId, receiverId, content, type = 'text', imageUrl = null) {
    // Vérifier que MongoDB est connecté
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB n\'est pas connecté. Veuillez démarrer MongoDB.');
    }

    // Créer ou trouver la conversation
    const participants = [senderId, receiverId].sort();
    const conversationId = participants.join('_');

    let conversation = await Conversation.findOne({ participants });
    if (!conversation) {
      conversation = await Conversation.create({
        participants,
        unreadCount: new Map(),
      });
    }

    // Créer le message avec type et imageUrl si fournis
    const messageData = {
      conversationId,
      senderId,
      receiverId,
      type,
    };

    if (content) {
      messageData.content = content;
    }

    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }

    const message = await Message.create(messageData);

    // Mettre à jour la conversation
    conversation.lastMessage = message._id;
    const unreadMap = conversation.unreadCount || new Map();
    const currentCount = unreadMap.get(receiverId) || 0;
    unreadMap.set(receiverId, currentCount + 1);
    conversation.unreadCount = unreadMap;
    await conversation.save();

    return {
      id: message._id.toString(),
      conversationId,
      senderId,
      receiverId,
      content: message.content || '',
      type: message.type || 'text',
      imageUrl: message.imageUrl || null,
      timestamp: message.createdAt.toISOString(),
      read: false,
    };
  },

  async getConversations(userId) {
    // Vérifier que MongoDB est connecté
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB non connecté, retour d\'un tableau vide');
      return [];
    }

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    return conversations.map((conv) => {
      const otherUserId = conv.participants.find((id) => id !== userId);
      const unreadCount = (conv.unreadCount?.get(userId) || 0);
      
      // Le conversationId est le format participants.join('_') utilisé dans les messages
      const sortedParticipants = [...conv.participants].sort();
      const conversationId = sortedParticipants.join('_');
      
      return {
        id: conversationId, // Utiliser le conversationId formaté au lieu de l'ID MongoDB
        participants: conv.participants,
        lastMessage: conv.lastMessage
          ? {
              id: conv.lastMessage._id.toString(),
              conversationId: conversationId, // Ajouter le conversationId au lastMessage
              senderId: conv.lastMessage.senderId,
              receiverId: conv.lastMessage.receiverId,
              content: conv.lastMessage.content || '',
              type: conv.lastMessage.type || 'text',
              imageUrl: conv.lastMessage.imageUrl,
              timestamp: conv.lastMessage.createdAt.toISOString(),
              read: conv.lastMessage.read,
              deletedForEveryone: conv.lastMessage.deletedForEveryone === true,
              deletedAt: conv.lastMessage.deletedAt ? conv.lastMessage.deletedAt.toISOString() : undefined,
              deletedBy: conv.lastMessage.deletedBy || undefined,
            }
          : undefined,
        unreadCount,
        updatedAt: conv.updatedAt.toISOString(),
      };
    });
  },

  async getMessages(conversationId) {
    // Vérifier que MongoDB est connecté
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB non connecté, retour d\'un tableau vide');
      return [];
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    return messages.map((msg) => ({
      id: msg._id.toString(),
      conversationId,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      content: msg.content || '',
      type: msg.type || 'text',
      imageUrl: msg.imageUrl,
      timestamp: msg.createdAt.toISOString(),
      read: msg.read,
      readAt: msg.readAt?.toISOString(),
      deletedForEveryone: msg.deletedForEveryone === true,
      deletedAt: msg.deletedAt ? msg.deletedAt.toISOString() : undefined,
      deletedBy: msg.deletedBy || undefined,
    }));
  },

  async markAsRead(conversationId, userId) {
    // Vérifier que MongoDB est connecté
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB non connecté, impossible de marquer comme lu');
      return;
    }

    await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    // Mettre à jour le compteur de la conversation
    const participants = conversationId.split('_');
    const conversation = await Conversation.findOne({ participants });
    if (conversation) {
      const unreadMap = conversation.unreadCount || new Map();
      unreadMap.set(userId, 0);
      conversation.unreadCount = unreadMap;
      await conversation.save();
    }
  },

  // Supprimer un message "pour tous" (expéditeur + receveur) dans un délai de 24h
  async deleteForEveryone(messageId, requesterId) {
    // Vérifier que MongoDB est connecté
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB n\'est pas connecté. Veuillez démarrer MongoDB.');
    }

    const msg = await Message.findById(messageId);
    if (!msg) {
      const err = new Error('Message introuvable');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (msg.deletedForEveryone === true) {
      return {
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        messageId: msg._id.toString(),
        deletedAt: msg.deletedAt ? msg.deletedAt.toISOString() : new Date().toISOString(),
        deletedBy: msg.deletedBy || requesterId,
      };
    }

    if (msg.senderId !== requesterId) {
      const err = new Error('Vous ne pouvez supprimer que vos propres messages');
      err.code = 'FORBIDDEN';
      throw err;
    }

    const createdAt = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
    const now = Date.now();
    const maxDelayMs = 24 * 60 * 60 * 1000;
    if (!createdAt || now - createdAt > maxDelayMs) {
      const err = new Error('Délai dépassé : suppression possible uniquement dans les 24 heures');
      err.code = 'TOO_LATE';
      throw err;
    }

    // Soft-delete: on garde le message mais on masque le contenu comme WhatsApp
    msg.deletedForEveryone = true;
    msg.deletedAt = new Date();
    msg.deletedBy = requesterId;
    msg.type = 'text';
    msg.content = '';
    msg.imageUrl = undefined;
    await msg.save();

    return {
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      messageId: msg._id.toString(),
      deletedAt: msg.deletedAt.toISOString(),
      deletedBy: requesterId,
    };
  },
};
