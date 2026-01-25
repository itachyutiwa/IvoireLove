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
    type: 'text' | 'image' = 'text',
    imageUrl?: string
  ): Promise<Message> {
    const response = await api.post<Message>('/messages/send', {
      receiverId,
      content,
      type,
      imageUrl,
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
}

export const messageService = new MessageService();

