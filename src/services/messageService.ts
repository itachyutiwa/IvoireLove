import { api } from './api';
import { Message, Conversation } from '@/types';

class MessageService {
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get<Conversation[]>('/messages/conversations');
    return response.data;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const response = await api.get<Message[]>(`/messages/conversations/${conversationId}`);
    return response.data;
  }

  async sendMessage(
    receiverId: string,
    content: string,
    type: 'text' | 'image' | 'audio' | 'video' = 'text',
    imageUrl?: string,
    options?: { voiceUrl?: string; videoUrl?: string; replyToMessageId?: string }
  ): Promise<Message> {
    const response = await api.post<Message>('/messages/send', {
      receiverId,
      content,
      type,
      imageUrl,
      voiceUrl: options?.voiceUrl,
      videoUrl: options?.videoUrl,
      replyToMessageId: options?.replyToMessageId,
    });
    return response.data;
  }

  async uploadMessagePhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post<{ url: string }>('/users/messages/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.url;
  }

  async markAsRead(conversationId: string): Promise<void> {
    await api.post(`/messages/conversations/${conversationId}/read`);
  }

  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}`);
  }

  async uploadVoice(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('voice', file);
    const response = await api.post<{ url: string }>('/messages/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.url;
  }

  async uploadVideo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('video', file);
    const response = await api.post<{ url: string }>('/messages/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.url;
  }

  async toggleReaction(messageId: string, emoji: string): Promise<{ messageId: string; conversationId: string; reactions: Record<string, string[]> }> {
    const response = await api.post<{ messageId: string; conversationId: string; reactions: Record<string, string[]> }>(
      `/messages/${messageId}/reactions`,
      { emoji }
    );
    return response.data;
  }
}

export const messageService = new MessageService();

