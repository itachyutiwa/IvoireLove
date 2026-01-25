import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';
import { userService } from '@/services/userService';
import { messageService } from '@/services/messageService';

export const useNavigationCounts = () => {
  const { user } = useAuthStore();
  const { conversations } = useMessageStore();
  const [newProfilesCount, setNewProfilesCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);
  const [unreadConversationsCount, setUnreadConversationsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    if (!user) {
      setNewProfilesCount(0);
      setMatchesCount(0);
      setUnreadConversationsCount(0);
      setIsLoading(false);
      return;
    }

    try {
      // Charger les profils disponibles pour découvrir
      const discoveries = await userService.getDiscoveries();
      setNewProfilesCount(discoveries?.length || 0);

      // Charger les matchs et les conversations pour déterminer les matchs sans conversation
      const [matches, conversationsData] = await Promise.all([
        userService.getMatches(),
        messageService.getConversations(),
      ]);

      // Compter les matchs qui n'ont pas encore de conversation
      // Le conversationId est au format: participants.sort().join('_')
      const matchesWithoutConversation = matches.filter((match) => {
        const participants = [user.id, match.id].sort();
        const conversationId = participants.join('_');
        // Vérifier si une conversation existe pour ce match
        return !conversationsData.some((conv) => conv.id === conversationId);
      });
      setMatchesCount(matchesWithoutConversation.length);

      // Compter le nombre de conversations distinctes avec des messages non lus (pas le nombre total de messages)
      // Une conversation compte si elle a des messages non lus ET le dernier message vient d'un autre utilisateur
      const conversationsWithUnread = conversationsData.filter((conv) => {
        return (
          conv.unreadCount > 0 &&
          conv.lastMessage &&
          conv.lastMessage.senderId !== user.id
        );
      });
      setUnreadConversationsCount(conversationsWithUnread.length);
    } catch (error) {
      console.error('Error loading navigation counts:', error);
      // En cas d'erreur, garder les valeurs précédentes
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Recharger les compteurs périodiquement
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      loadCounts();
    }, 30000); // Recharger toutes les 30 secondes

    return () => clearInterval(interval);
  }, [user, loadCounts]);

  // Recharger quand les conversations changent (pour mettre à jour le compteur de messages non lus)
  useEffect(() => {
    if (!user || conversations.length === 0) {
      // Si pas de conversations, le compteur est 0
      setUnreadConversationsCount(0);
      return;
    }

    // Recalculer le nombre de conversations distinctes avec messages non lus
    // Une conversation compte si elle a des messages non lus ET le dernier message vient d'un autre utilisateur
    const conversationsWithUnread = conversations.filter((conv) => {
      return (
        conv.unreadCount > 0 &&
        conv.lastMessage &&
        conv.lastMessage.senderId !== user.id
      );
    });
    setUnreadConversationsCount(conversationsWithUnread.length);
  }, [conversations, user]);

  return {
    newProfilesCount,
    matchesCount,
    unreadMessagesCount: unreadConversationsCount,
    isLoading,
    refreshCounts: loadCounts,
  };
};

