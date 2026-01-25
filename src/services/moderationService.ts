import { api } from './api';

export type ReportReason = 'scam' | 'spam' | 'harassment' | 'fake_profile' | 'other';

class ModerationService {
  async reportUser(input: {
    reportedUserId: string;
    reason: ReportReason | string;
    details?: string;
    conversationId?: string;
    messageId?: string;
  }) {
    const response = await api.post('/reports', input);
    return response.data;
  }

  async blockUser(blockedUserId: string) {
    const response = await api.post('/blocks', { blockedUserId });
    return response.data as { id: string; blockerId: string; blockedUserId: string; createdAt: string };
  }

  async unblockUser(blockedUserId: string) {
    const response = await api.delete(`/blocks/${blockedUserId}`);
    return response.data;
  }
}

export const moderationService = new ModerationService();

