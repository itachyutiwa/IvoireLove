import express from 'express';
import { pgPool } from '../config/database.js';
import { PaymentModel } from '../models/Payment.js';
import { SubscriptionModel } from '../models/Subscription.js';
import { authenticateToken } from '../middleware/auth.js';
import { PAYMENT_NUMBERS } from './subscriptions.js';

const router = express.Router();

// Initier un paiement
router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const { planType, paymentMethod, reference, amount, cardData } = req.body;

    // Validation
    if (!planType || !paymentMethod || !amount) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    if (!['MTN', 'ORANGE', 'MOOV', 'WAVE', 'CARD'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Méthode de paiement invalide' });
    }

    // Pour les méthodes mobiles, la référence est requise
    if (['MTN', 'ORANGE', 'MOOV', 'WAVE'].includes(paymentMethod) && !reference) {
      return res.status(400).json({ message: 'La référence est requise pour cette méthode de paiement' });
    }

    // Pour les cartes prépayées, générer une référence unique
    let finalReference = reference;
    if (paymentMethod === 'CARD') {
      finalReference = `CARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Validation des données de carte
      if (!cardData || !cardData.cardNumber || !cardData.cardCvv || !cardData.cardExpiry) {
        return res.status(400).json({ message: 'Informations de carte incomplètes' });
      }

      // Validation basique du numéro de carte
      const cardNumberDigits = cardData.cardNumber.replace(/\D/g, '');
      if (cardNumberDigits.length < 12) {
        return res.status(400).json({ message: 'Numéro de carte invalide' });
      }
    }

    // Vérifier si la référence existe déjà (pour les méthodes mobiles)
    if (['MTN', 'ORANGE', 'MOOV', 'WAVE'].includes(paymentMethod)) {
      const existingPayment = await PaymentModel.findByReference(pgPool, finalReference, paymentMethod);
      if (existingPayment && existingPayment.status === 'confirmed') {
        return res.status(400).json({ message: 'Cette référence a déjà été utilisée' });
      }
    }

    // Créer le paiement
    const payment = await PaymentModel.create(
      pgPool,
      req.user.userId,
      planType,
      paymentMethod,
      finalReference,
      amount
    );

    res.json(payment);
  } catch (error) {
    console.error('Initiate payment error:', error);
    if (error.code === '23505') {
      // Violation de contrainte unique (référence déjà utilisée)
      return res.status(400).json({ message: 'Cette référence a déjà été utilisée' });
    }
    res.status(500).json({ message: 'Erreur lors de l\'initiation du paiement' });
  }
});

// Confirmer un paiement (vérification automatique de la référence)
router.post('/:paymentId/confirm', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reference, cardData } = req.body;

    // Récupérer le paiement
    const payment = await PaymentModel.findById(pgPool, paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Paiement introuvable' });
    }

    // Vérifier que le paiement appartient à l'utilisateur
    if (payment.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Pour les paiements par carte prépayée
    if (payment.paymentMethod === 'CARD') {
      if (!cardData || !cardData.cardNumber || !cardData.cardCvv || !cardData.cardExpiry) {
        return res.status(400).json({ message: 'Informations de carte incomplètes' });
      }

      // En développement : confirmer automatiquement
      // En production : intégrer avec un processeur de paiement (Stripe, Paystack, etc.)
      if (process.env.NODE_ENV === 'development') {
        // Simuler une validation de carte (en production, utiliser un vrai processeur)
        // Vérification basique : numéro de carte valide (12+ chiffres)
        if (cardData.cardNumber.replace(/\D/g, '').length < 12) {
          return res.status(400).json({ message: 'Numéro de carte invalide' });
        }

        // Validation du CVV
        const cardCvvDigits = cardData.cardCvv.replace(/\D/g, '');
        if (cardCvvDigits.length < 3 || cardCvvDigits.length > 4) {
          return res.status(400).json({ message: 'CVV invalide (3-4 chiffres requis)' });
        }

        // Confirmer le paiement
        const confirmedPayment = await PaymentModel.confirm(pgPool, paymentId);

        // Activer l'abonnement
        await SubscriptionModel.create(pgPool, req.user.userId, payment.planType);

        res.json(confirmedPayment);
      } else {
        // TODO: Intégrer avec un processeur de paiement réel
        // Pour l'instant, on confirme automatiquement
        const confirmedPayment = await PaymentModel.confirm(pgPool, paymentId);
        await SubscriptionModel.create(pgPool, req.user.userId, payment.planType);
        res.json(confirmedPayment);
      }
      return;
    }

    // Pour les méthodes mobiles : vérifier la référence
    if (payment.reference !== reference) {
      return res.status(400).json({ message: 'Référence incorrecte' });
    }

    // En développement : confirmer automatiquement le paiement
    // En production, vous devrez intégrer une API de vérification des opérateurs mobiles
    if (process.env.NODE_ENV === 'development') {
      // Confirmer automatiquement en développement
      const confirmedPayment = await PaymentModel.confirm(pgPool, paymentId);

      // Activer l'abonnement
      await SubscriptionModel.create(pgPool, req.user.userId, payment.planType);

      res.json(confirmedPayment);
    } else {
      // En production : vérifier avec l'API de l'opérateur
      // Pour l'instant, on confirme automatiquement
      // TODO: Intégrer les APIs MTN, Orange, Moov, Wave
      const confirmedPayment = await PaymentModel.confirm(pgPool, paymentId);

      // Activer l'abonnement
      await SubscriptionModel.create(pgPool, req.user.userId, payment.planType);

      res.json(confirmedPayment);
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ message: 'Erreur lors de la confirmation du paiement' });
  }
});

// Obtenir le statut d'un paiement
router.get('/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await PaymentModel.findById(pgPool, paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Paiement introuvable' });
    }

    // Vérifier que le paiement appartient à l'utilisateur
    if (payment.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du paiement' });
  }
});

// Obtenir les numéros de paiement
router.get('/numbers', authenticateToken, async (req, res) => {
  res.json(PAYMENT_NUMBERS);
});

export default router;

