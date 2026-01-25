import { create } from 'zustand';
import { Message, Conversation } from '@/types';
import { messageService } from '@/services/messageService';
import { useAuthStore } from '@/store/authStore';

interface MessageState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Record<string, Message[]>;
  unreadCount: number;
  isLoading: boolean;
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversationId: string) => void;
  addMessage: (message: Message) => void;
  markMessageDeleted: (conversationId: string, messageId: string, deletedBy?: string) => void;
  markAsRead: (conversationId: string) => Promise<void>;
  updateUnreadCount: () => void;
  loadMessages: (conversationId: string) => Promise<void>;
  updateUserPresence: (userId: string, isOnline: boolean, lastActive?: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: {},
  unreadCount: 0,
  isLoading: false,

  setConversations: (conversations: Conversation[]) => {
    const unreadCount = conversations.reduce(
      (sum, conv) => sum + conv.unreadCount,
      0
    );
    set({ conversations, unreadCount });
  },

  setCurrentConversation: (conversationId: string) => {
    const conversation = get().conversations.find(
      (c) => c.id === conversationId
    );
    set({ currentConversation: conversation || null });
  },

  addMessage: (message: Message) => {
    const { messages, conversations, currentConversation } = get();
    const conversationMessages = messages[message.conversationId] || [];
    
    // Éviter les doublons
    if (!conversationMessages.find((m) => m.id === message.id)) {
      const updatedMessages = {
        ...messages,
        [message.conversationId]: [...conversationMessages, message],
      };

      // Mettre à jour la conversation
      const updatedConversations = conversations.map((conv) => {
        if (conv.id === message.conversationId) {
          // Récupérer l'utilisateur actuel depuis le store auth
          const currentUserId = useAuthStore.getState().user?.id;
          
          // Le message est reçu si le senderId n'est pas l'utilisateur actuel
          const isReceivedMessage = currentUserId && message.senderId !== currentUserId;
          const isConversationOpen = currentConversation?.id === message.conversationId;
          
          return {
            ...conv,
            lastMessage: message,
            updatedAt: message.timestamp,
            // Incrémenter uniquement si c'est un message reçu ET que la conversation n'est pas ouverte
            unreadCount: isReceivedMessage && !isConversationOpen
              ? conv.unreadCount + 1
              : conv.unreadCount,
          };
        }
        return conv;
      });

      const unreadCount = updatedConversations.reduce(
        (sum, conv) => sum + conv.unreadCount,
        0
      );

      set({
        messages: updatedMessages,
        conversations: updatedConversations,
        unreadCount,
      });
    }
  },

  markMessageDeleted: (conversationId: string, messageId: string, deletedBy?: string) => {
    const { messages, conversations, currentConversation } = get();
    const currentUserId = useAuthStore.getState().user?.id;

    const list = messages[conversationId] || [];
    const updatedList: Message[] = list.map((m) => {
      if (m.id !== messageId) return m;
      return {
        ...m,
        deletedForEveryone: true,
        deletedAt: new Date().toISOString(),
        deletedBy: deletedBy || currentUserId,
        type: 'text' as const,
        content: '',
        imageUrl: undefined,
      } as Message;
    });

    // Mettre à jour messages
    const updatedMessages = {
      ...messages,
      [conversationId]: updatedList,
    };

    const updatedConversations = conversations.map((conv) => {
      if (conv.id !== conversationId) return conv;
      return {
        ...conv,
        // Garder le lastMessage (même id) mais il sera rendu comme "supprimé"
        lastMessage:
          conv.lastMessage?.id === messageId
            ? {
                ...conv.lastMessage,
                deletedForEveryone: true,
                deletedAt: new Date().toISOString(),
                deletedBy: deletedBy || currentUserId,
                type: 'text' as const,
                content: '',
                imageUrl: undefined,
              } as Message
            : conv.lastMessage,
      };
    });

    const updatedCurrentConversation =
      currentConversation?.id === conversationId
        ? {
            ...currentConversation,
            lastMessage:
              currentConversation.lastMessage?.id === messageId
                ? {
                    ...currentConversation.lastMessage,
                    deletedForEveryone: true,
                    deletedAt: new Date().toISOString(),
                    deletedBy: deletedBy || currentUserId,
                    type: 'text' as const,
                    content: '',
                    imageUrl: undefined,
                  } as Message
                : currentConversation.lastMessage,
          }
        : currentConversation;

    const totalUnread = updatedConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    set({
      messages: updatedMessages,
      conversations: updatedConversations,
      currentConversation: updatedCurrentConversation,
      unreadCount: totalUnread,
    });
  },

  markAsRead: async (conversationId: string) => {
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) return;

    // Mettre à jour immédiatement l'état local pour une réponse instantanée
    const { conversations, messages } = get();
    const updatedConversations = conversations.map((conv) =>
      conv.id === conversationId
        ? { ...conv, unreadCount: 0 }
        : conv
    );

    // Marquer comme lus UNIQUEMENT les messages reçus (pas ceux envoyés)
    const updatedMessages = {
      ...messages,
      [conversationId]: (messages[conversationId] || []).map((msg) => {
        // Un message est lu seulement s'il a été reçu par l'utilisateur actuel
        const isReceivedMessage = msg.receiverId === currentUserId;
        if (isReceivedMessage && !msg.read) {
          return {
            ...msg,
            read: true,
            readAt: msg.readAt || new Date().toISOString(),
          };
        }
        return msg;
      }),
    };

    const unreadCount = updatedConversations.reduce(
      (sum, conv) => sum + conv.unreadCount,
      0
    );

    set({
      conversations: updatedConversations,
      messages: updatedMessages,
      unreadCount,
    });

    // Synchroniser avec le backend (qui ne marquera que les messages reçus)
    try {
      await messageService.markAsRead(conversationId);
      // Recharger les messages pour avoir le statut de lecture mis à jour depuis le backend
      // Cela permet de voir les ✓✓ sur les messages envoyés qui ont été lus par le destinataire
      setTimeout(async () => {
        try {
          const freshMessages = await messageService.getMessages(conversationId);
          const sortedMessages = freshMessages.sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeA - timeB;
          });
          set((state) => ({
            messages: {
              ...state.messages,
              [conversationId]: sortedMessages,
            },
          }));
        } catch (err) {
          console.error('Error reloading messages after mark as read:', err);
        }
      }, 500);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // Ne pas annuler la mise à jour locale même si l'API échoue
    }
  },

  updateUnreadCount: () => {
    const unreadCount = get().conversations.reduce(
      (sum, conv) => sum + conv.unreadCount,
      0
    );
    set({ unreadCount });
  },

  loadMessages: async (conversationId: string) => {
    set({ isLoading: true });
    try {
      const messages = await messageService.getMessages(conversationId);
      // Trier les messages par timestamp (plus ancien en premier)
      const sortedMessages = messages.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeA - timeB;
      });
      console.log(`Loaded ${sortedMessages.length} messages for conversation ${conversationId}`);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: sortedMessages,
        },
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateUserPresence: (userId: string, isOnline: boolean, lastActive?: string) => {
    const { conversations, currentConversation } = get();
    const nowIso = new Date().toISOString();

    const updatedConversations = conversations.map((conv) => {
      if (!conv.otherUser || conv.otherUser.id !== userId) return conv;
      return {
        ...conv,
        otherUser: {
          ...conv.otherUser,
          isOnline,
          lastActive: lastActive || nowIso,
        },
      };
    });

    const updatedCurrentConversation =
      currentConversation?.otherUser?.id === userId
        ? {
            ...currentConversation,
            otherUser: {
              ...currentConversation.otherUser,
              isOnline,
              lastActive: lastActive || nowIso,
            },
          }
        : currentConversation;

    set({ conversations: updatedConversations, currentConversation: updatedCurrentConversation });
  },
}));

