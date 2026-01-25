import { api } from './api';
import { SupportTicket } from '@/types';

class SupportService {
  async listTickets(): Promise<SupportTicket[]> {
    const response = await api.get<SupportTicket[]>('/support');
    return response.data;
  }

  async createTicket(subject: string, body: string): Promise<SupportTicket> {
    const response = await api.post<SupportTicket>('/support', { subject, body });
    return response.data;
  }
}

export const supportService = new SupportService();

