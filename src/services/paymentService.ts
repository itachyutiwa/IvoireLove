import { api } from './api';

export interface PaymentRequest {
  planType: string;
  paymentMethod: string;
  reference: string;
  amount: number;
  cardData?: {
    cardNumber: string;
    cardCvv: string;
    cardExpiry: string;
  };
}

export interface PaymentResponse {
  id: string;
  status: 'pending' | 'confirmed' | 'failed';
  reference: string;
  paymentMethod: string;
  amount: number;
  createdAt: string;
}

class PaymentService {
  async initiatePayment(data: PaymentRequest): Promise<PaymentResponse> {
    const response = await api.post<PaymentResponse>('/payments/initiate', data);
    return response.data;
  }

  async confirmPayment(
    paymentId: string,
    reference: string,
    cardData?: { cardNumber: string; cardCvv: string; cardExpiry: string }
  ): Promise<PaymentResponse> {
    const response = await api.post<PaymentResponse>(`/payments/${paymentId}/confirm`, {
      reference,
      cardData,
    });
    return response.data;
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    const response = await api.get<PaymentResponse>(`/payments/${paymentId}`);
    return response.data;
  }
}

export const paymentService = new PaymentService();

