import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';
import { Message } from '@/types';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  getSocket(): Socket | null {
    return this.socket;
  }

  connect(): void {
    const token = useAuthStore.getState().token;
    if (!token || this.isConnected) return;

    this.socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000', {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Socket disconnected');
    });

    // Écouter les nouveaux messages
    this.socket.on('message:new', (message: Message) => {
      console.log('New message received via socket:', message);
      useMessageStore.getState().addMessage(message);
    });

    // Écouter les messages envoyés avec succès
    this.socket.on('message:sent', (message: Message) => {
      console.log('Message sent confirmed via socket:', message);
      useMessageStore.getState().addMessage(message);
    });

    // Écouter les messages lus (quand le destinataire ouvre la conversation)
    this.socket.on('message:read', async (data: { conversationId: string; userId: string }) => {
      // Recharger les messages pour mettre à jour le statut de lecture
      // Cela permet d'afficher les ✓✓ sur les messages envoyés qui ont été lus
      const { loadMessages } = useMessageStore.getState();
      try {
        await loadMessages(data.conversationId);
      } catch (error) {
        console.error('Error reloading messages after read notification:', error);
      }
    });

    // Écouter les nouveaux matchs
    this.socket.on('match:new', (data: { matchId: string; userId: string }) => {
      // Gérer la notification de match
      console.log('New match!', data);
    });

    // Écouter les changements de statut en ligne
    this.socket.on('user:online', (data: { userId: string }) => {
      console.log('User online:', data.userId);
      // Mettre à jour le statut en ligne dans le store si nécessaire
    });

    this.socket.on('user:offline', (data: { userId: string }) => {
      console.log('User offline:', data.userId);
      // Mettre à jour le statut hors ligne dans le store si nécessaire
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  sendMessage(receiverId: string, content: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('message:send', { receiverId, content });
    }
  }

  joinConversation(conversationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('conversation:join', { conversationId });
    }
  }

  leaveConversation(conversationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('conversation:leave', { conversationId });
    }
  }
}

export const socketService = new SocketService();

